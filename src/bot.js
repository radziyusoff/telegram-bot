import TelegramBotClient from 'node-telegram-bot-api'
import StateMachine from 'javascript-state-machine'
import Model from './model'
// var mymodel=require("./model")

function createFsm() {
  return StateMachine.create({
    initial: 'waitingstart',
    final: 'final',
    events: [
      { name: 'gotstart', from: 'waitingstart', to: 'waitingoption' },
      { name: 'gotoption', from: 'waitingoption', to: 'process' },
      { name: 'gottext', from: 'process', to: 'process' },
      { name: 'gotstop', from: 'process', to: 'confirm' },
      { name: 'confirmed', from: 'confirm', to: 'final' },
      { name: 'cancelled', from: 'confirm', to: 'echoing' },
      { name: 'invalid', from: 'confirm', to: 'confirm' }
    ]
  })
}

function eventFromStateAndMessageText(state, text) {
  switch (state) {
  case 'waitingstart':
    return text === '/start' && 'gotstart'
    break
  case 'waitingoption':
    return 'gotoption'
    break
  case 'process':
    return text === '/stop' ? 'gotstop' : 'gottext'
    break
  case 'confirm':
    if (text === 'yes') {
      return 'confirmed'
    } else if (text === 'no') {
      return 'cancelled'
    } else {
      return 'invalid'
    }
  }
}

export default class Bot {
  constructor(token) {
    this.client = new TelegramBotClient(token, { polling: true })
  }

  start() {
    this.client.on('message', message => {
      if (!message.reply_to_message) {
        this.respondTo(message)
      }
    })
  }

  async respondTo(message) {
    let fsm = createFsm()
    let lastReply = message

    let name
    let lastMessage

    fsm.ongotstart = () => {
      lastMessage = this.client.sendMessage(message.chat.id, 
                                            "Welcome "+message.from.first_name+", please choose one option!", 
                                              {
                                                reply_markup: 
                                                {"keyboard": [
                                                  ["1# Last seen radius session"],
                                                  ["2# Last seen radius session"],
                                                  ["3# Last seen radius session"],
                                                  ["4# Last seen radius session"],
                                                  // ["Option 2"], 
                                                  // ["Option 3"]
                                                ]},
                                              }
                                            )
    }

    fsm.ongotoption = (event, from, to, message) => {
      name = message.text
      
      lastMessage = this.client.sendMessage(message.chat.id,
                                            `Your login_id to lookup in RADIUS?`,
                                            { reply_markup: JSON.stringify({ force_reply: true }) })
    }

    fsm.ongottext = (event, from, to, message) => {
      Model.getRadiusLatest(message.text).then((rows) =>{
      if(rows && rows.length>0){
        let result = rows[0]
        lastMessage = this.client.sendMessage(message.chat.id,
                                                `Radius Information:- `+
                                                `\n Login id: *${message.text}*`+
                                                `\n Mac Address: *${result.macaddr}*`+
                                                `\n RG Model: *${result.rg_model}*`+
                                                `\n RG Vendor: *${result.rg_vendor}*`+
                                                `\n RG Version: *${result.rg_version}*`+
                                                `\n Last seen: *${result.last_update_ts}*`+
                                                `\n Bras: *${result.bras}*`+
                                                `\n Bras port: *${result.brasport}*`+
                                                `\n Frame/Slot/Port: *${result.fsp}*`+
                                                `\n Package: *${result.package}*`+
                                                `\n IP V4: *${result.ipaddr_v4}*`+
                                                `\n IP V6: *${result.ipaddr_v6}*`+
                                                ``,
                                                {parse_mode: "markdown"}
                                                // { reply_markup: JSON.stringify({ force_reply: true }) }
                                                )
      }
      else{
        lastMessage = this.client.sendMessage(message.chat.id,
          `Radius Information for *${message.text}* was not found!`+
          ``,
          {parse_mode: "markdown"}
          // { reply_markup: JSON.stringify({ force_reply: true }) }
          )

      }

      }, (err) => {
        console.log(err)
      });

    }

    fsm.ongotstop = () => {
      lastMessage = this.client.sendMessage(message.chat.id,
                                            'Are you sure you want to stop? (yes/no)',
                                            // { reply_markup: JSON.stringify({ force_reply: true }) }
                                            {
                                              reply_markup: JSON.stringify(
                                              {
                                                keyboard: [["yes"], ["no"]],
                                                remove_keyboard: true},
                                              ),
                                            }
                                            )
    }

    fsm.onconfirmed = () => {
      lastMessage = this.client.sendMessage(message.chat.id,
                                            'We\'re done here, see ya!')
    }

    fsm.oncancelled = () => {
      lastMessage = this.client.sendMessage(message.chat.id,
                                            'Alright, going back to echoing',
                                            { reply_markup: JSON.stringify({ force_reply: true }) })
    }

    fsm.oninvalid = () => {
      lastMessage = this.client.sendMessage(message.chat.id,
                                            'Sorry, I didn\'t catch that, do you want to cancel? (yes/no)',
                                            { reply_markup: JSON.stringify({ force_reply: true }) })
    }

    while (!fsm.isFinished()) {
      let text = lastReply.text
      let event = eventFromStateAndMessageText(fsm.current, text)

      // enable this for bot to read all message
      // if (!event || fsm.cannot(event)) {
      //   this.client.sendMessage(message.chat.id, 'I wasn\'t expecting that, try /start')
      //   break
      // }

      fsm[event](lastReply)

      let sentMessage = await lastMessage
      lastReply = await new Promise(resolve => this.client.onReplyToMessage(sentMessage.chat.id, sentMessage.message_id, resolve))
    }
  }
}
