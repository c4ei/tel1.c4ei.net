// _sendAmt="0.01"
////////////////////////////////////////////////////////////////////
require('dotenv').config();
const express = require('express');
const axios = require('axios');
const bodyParser = require('body-parser');
const devVer ="V1.2";
//////////////////////////////////
const Web3 = require("web3");
const web3 = new Web3(new Web3.providers.HttpProvider(process.env.AAH_RPC));

// npm i sync-mysql
var db_config = require(__dirname + '/database.js');// 2020-09-13
var sync_mysql = require('sync-mysql'); //2020-01-28
let sync_connection = new sync_mysql(db_config.constr());
////////////////////////////////////////////////////////////////////

const { TOKEN, SERVER_URL } = process.env;
const TELEGRAM_API = `https://api.telegram.org/bot${TOKEN}`;
const URI = `/webhook/${TOKEN}`;
const WEBHOOK_URL = SERVER_URL + URI;
const banWord = [".com",".net",".org", "http", "https","t.me","t.cn","fuck"];
const adminlist = [346467775]; // 346467775 x3
const notalklist = [727681286]
const app = express();

const { Bot } = require("grammy");
const bot = new Bot(TOKEN);

bot.api.setMyCommands([
{ command: "/myaddress", description: "내 주소생성 (make my address)" },
{ command: "/mining", description: "채굴 mining" },
{ command: "/sendaah", description: "AAH 전송 /sendcaah/받을주소/전송수량" },
]);

app.use(bodyParser.json());
// console.log(`${TELEGRAM_API}/setWebhook?url=${WEBHOOK_URL}`);
const init = async () => {
    // const res0 = await axios.get(`${TELEGRAM_API}/deleteWebhook`);
    const res = await axios.get(`${TELEGRAM_API}/setWebhook?url=${WEBHOOK_URL}`);
    // console.log(res.data);
    // console.log(get_users_cnt() +" : user count");
    // fn_sendMessage('-1001639523543', '서버를 시작 하였습니다.' +devVer);
}
////////////////////////////////////////////////////////////////////
const addUserBanYN="N";
////////////////////////////////////////////////////////////////////
app.post(URI, async (req, res) => {
    // console.log(req.body)
    try{
        if(req.body.message.chat!=undefined)
        {
            const chatId    = req.body.message.chat.id;
            const chatType  = req.body.message.chat.type;  // 'supergroup'
            const rcv_text  = req.body.message.text==null?"":req.body.message.text;
            const fromId    = req.body.message.from.id;
            const fromLname = req.body.message.from.username;
            const fromFname = req.body.message.from.first_name;
            const messageId = req.body.message.message_id;
            let userName = "";
            if(fromLname!=undefined){
                userName=fromLname;
            }
            if(fromFname!=undefined&&userName==""){
                userName=fromLname;
            }
            if(userName!=undefined){
                var reg = /[\{\}\[\]\/?.,;:|\)*~`!^\-_+<>@\#$%&\\\=\(\'\"]/gi;
                userName = userName.replace(reg,'');
            }

            if(rcv_text!="")
            {
                // console.log(req.body.message);
                ////////// bot chat
                if(rcv_text.startsWith('/'))
                {
                    if(rcv_text=="/myaddress"||rcv_text=="/myaddress@aah_echo_bot"){
                        console.log("/myaddress : "+fromId+"/"+userName);
                        let sendAddr = await fn_myaddress(fromId, userName);
                        fn_sendMessage(chatId, sendAddr);
                        //message.chat.type == "private"
                    }
                    if(rcv_text=="/myaah"||rcv_text=="/balance"){
                        let myAddr = await fn_getmyaddr(fromId);
                        if(myAddr=="no address"){
                            return myAddr;
                        } else {
                            await web3.eth.getBalance(myAddr, function(error, result) {
                                let wallet_balance = web3.utils.fromWei(result, "ether") +" AAH";
                                fn_sendMessage(chatId, wallet_balance);
                            });
                        }
                    }
                    if(rcv_text.indexOf("/sendaah")>-1)
                    {
                        let arr = rcv_text.split("/");
                        // console.log(arr.length + " : arr.length ");
                        if(arr.length==4){
                            let rcv_addr = arr[2];
                            rcv_addr = rcv_addr.replace(/ /g,'');
                            let rcv_amt = arr[3];
                            rcv_amt = rcv_amt.replace(/ /g,'');
                            console.log("131 - "+rcv_addr + " : rcv_addr / " +rcv_amt+" : rcv_amt /" +fromId+" : fromId ");
                            let myAddr = await fn_getmyaddr(fromId);
                            if(myAddr=="no address"){
                                return myAddr;
                            } else {
                                await web3.eth.getBalance(myAddr, function(error, result) {
                                    // console.log("Ln137 getBalanceAah : "+ result); //0x21725F3b26F74C8E451d851e040e717Fbcf19E5b
                                    let wallet_balance = web3.utils.fromWei(result, "ether");
                                    if(wallet_balance > rcv_amt){
                                        fn_sendTr(myAddr, rcv_addr, rcv_amt, chatId, fromId);
                                    }else{
                                        console.log("wallet_balance > rcv_amt" +wallet_balance +" > "+ rcv_amt);
                                    }
                                });
                            }
                        }
                    }
                    if(rcv_text.indexOf("/mining")>-1)
                    {
                        let myAddr = await fn_getmyaddr(fromId);
                        if(myAddr=="no address"){
                            fn_sendMessage(chatId, 'AAH 주소를 먼저 생성 하세요 (Please create a AAH address first) /myaddress ');
                        } else {
                            let sql = "SELECT count(userIdx) cnt FROM sendlog WHERE userIdx ='"+fromId+"' and memo='AAH_MINING' and regdate > DATE_ADD(now(), INTERVAL -7 HOUR)";
                            let result = sync_connection.query(sql);
                            let mining_Cnt = result[0].cnt;
                            if(mining_Cnt==0){
                                let sqls1 = "SELECT reqminingYN FROM users WHERE user_Id ='"+fromId+"'";
                                let results1 = sync_connection.query(sqls1);
                                let reqminingYN = results1[0].reqminingYN;
                                if (reqminingYN=='N'){
                                    fn_sendMining(process.env.AAH_BANK_ADDRESS, myAddr, "0.01", chatId, fromId);
                                }else{
                                    fn_sendMessage(chatId, '이미 처리중입니다. (It is already being processed.)');
                                }
                            }else{
                                try{
                                    // GMT 9 + 8 hour
                                    let sql9 = "SELECT DATE_ADD(regdate, INTERVAL 16 HOUR) nTime FROM sendlog WHERE userIdx ='"+fromId+"' and memo='AAH_MINING' ORDER BY regdate DESC LIMIT 1";
                                    let result9 = sync_connection.query(sql9);
                                    let nTime = result9[0].nTime;
                                    nTime = nTime.replace('T','_').replace('.000Z','');
                                    // console.log(sql9 +" / " + nTime);
                                    fn_sendMessage(chatId, '다음 마이닝은 '+nTime+' 이후 가능 합니다. (The next mining is possible after '+nTime+'.)');
                                }
                                catch(e){
                                    fn_sendMessage(chatId, '마이닝은 7시간 마다 가능 합니다. (Mining is possible every 8 hours.)');
                                }
                            }
                        }
                    }
                } else {
                    ////////// normal chat
                    console.log("["+chatId+":chatId]["+ fromId+":fromId]["+ userName+":userName]["+ messageId+":messageId]["+rcv_text+":rcv_text]");
                    if(fn_checkText(rcv_text)!=""){
                        // if(chatType!="supergroup"){
                        if(adminlist.indexOf(fromId)>-1){
                        } else {
                            await fn_banCheck(chatId, fromId, messageId);
                        }
                    }
                }
            }else{
                try{
                    if(adminlist.indexOf(fromId)>-1){
                    } else {
                        if(fn_checkText(rcv_text)!=""){
                            console.log("221 line : fn_checkText["+fn_checkText(rcv_text)+"]");
                            await fn_banCheck(chatId, fromId, messageId);
                        }
                    }
                }
                catch(e){

                }
                console.log("###else### rcv_text:"+rcv_text);
            }
        }
    }catch(e){
        console.log(e);
    }

    // await axios.post(`${TELEGRAM_API}/sendMessage`, { chat_id: chatId, text: text });
    // console.log("############### 31 line sendMessage ###############");
    return res.send();
});

app.listen(process.env.PORT || 4001, async () => {
    console.log('🚀 app running on port', process.env.PORT || 4001);
    await init();
});

/////////////////// air drop //////////////////////
async function fn_getmyaddr(myid){
    let sql = "SELECT user_id, address, user_name FROM users WHERE user_id ='"+myid+"'";
    let result = sync_connection.query(sql);
    if(result.length>0){
        let address = result[0].address;
        return address;
    }else{
        return "no address";
    }
}

async function fn_myaddress(myid, myname){
    let sql0 = "SELECT count(user_id) as Cnt FROM users WHERE user_id ='"+myid+"'";
    let result0 = sync_connection.query(sql0);
    let _Cnt = result0[0].Cnt;
    if(_Cnt > 0)
    {
        let sql = "SELECT user_id, address, user_name FROM users WHERE user_id ='"+myid+"'";
        // console.log(sql);
        let result = sync_connection.query(sql);
            // console.log(result.length +":result.length");
        let user_id = result[0].user_id;
        let address = result[0].address;
        let user_name = result[0].user_name;
        return address;
    } else {
        let sql1 = "SELECT idx,address from address WHERE useYN ='Y' AND mappingYN='N' ORDER BY idx LIMIT 1";
        let result1 = sync_connection.query(sql1);
        if(result1.length>0){
            let addr_idx = result1[0].idx;
            let addr_address = result1[0].address;
            try{
                let sql2 = "insert into users (user_id, address, user_name)";
                sql2 = sql2 + " values ('"+myid+"', '"+addr_address+"', '"+myname+"')";
                let result2 = sync_connection.query(sql2);
            }catch(e){
                console.log(sql2);
            }
            try{
                let sql3 = "update address set user_id='"+myid+"',mappingYN='Y',last_reg=now() where idx='"+addr_idx+"'";
                let result3 = sync_connection.query(sql3);
            }catch(e){
                console.log(sql3);
            }
            return addr_address;
        } else {
            // event end 2000 member end
            return "end event";
        }
    }
}

async function getBalanceAah(aah_addr){
    var wallet_balance = await web3.eth.getBalance(aah_addr, function(error, result) {
        wallet_balance = web3.utils.fromWei(result, "ether");
        return wallet_balance;
    });
}

async function fn_sendMining(send_addr, rcv_addr, rcv_amt, chatId, fromId){
    let sqls1 = "update users set reqminingYN='Y' WHERE user_Id ='"+fromId+"'";
    let result1 = sync_connection.query(sqls1);

    if (await fn_unlockAccount(send_addr))
    {
        try{
            // var user_ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress || req.socket.remoteAddress || req.connection.socket.remoteAddress;
            web3.eth.sendTransaction({
                from: send_addr,
                to: rcv_addr,
                value: web3.utils.toWei(rcv_amt,'ether'),
                gas: 300000
            }).
            once('sent', function(payload){ console.log(getCurTimestamp()+' ###  mining sent ###'+fromId+' / '+rcv_addr+' / '+rcv_amt); })
            .then(function(receipt){
                fn_send_tx_log(fromId, send_addr, rcv_addr, rcv_amt, receipt.blockNumber, receipt.contractAddress, receipt.blockHash, receipt.transactionHash,"AAH_MINING");
                web3.eth.getBalance(rcv_addr, function(error, result) {
                    let wallet_balance = web3.utils.fromWei(result, "ether") +" AAH";
                    fn_sendMessage(chatId, "#### AAH_MINING 발송 ####\n"+ rcv_addr +" 로\n"+rcv_amt+" AAH가 발송되었습니다.\n내 잔고 : "+ wallet_balance+"\ntransactionHash : "+receipt.transactionHash);
                    let sqls2 = "update users set reqminingYN='N' WHERE user_Id ='"+fromId+"'";
                    let result2 = sync_connection.query(sqls2);
                });
            });
        }catch(e){
            fn_sendMessage(chatId, "#### AAH_MINING 발송 ####\n채굴중 문제가 발생 하였습니다. ");
        }
    }
}

async function fn_sendTr(send_addr, rcv_addr, rcv_amt, chatId, fromId){
    // var user_ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress || req.socket.remoteAddress || req.connection.socket.remoteAddress;
    if (await fn_unlockAccount(send_addr))
    {
        web3.eth.sendTransaction({
            from: send_addr,
            to: rcv_addr,
            value: web3.utils.toWei(rcv_amt,'ether'),
            gas: 300000
        }).
        once('sent', function(payload){ console.log(getCurTimestamp()+' ###   user sent ###'); })
        .then(function(receipt){
            fn_send_tx_log(fromId, send_addr, rcv_addr, rcv_amt, receipt.blockNumber, receipt.contractAddress, receipt.blockHash, receipt.transactionHash,"AAH");
            web3.eth.getBalance(send_addr, function(error, result) {
                let wallet_balance = web3.utils.fromWei(result, "ether") +" AAH";
                fn_sendMessage(chatId, "#### AAH 발송 ####\n"+send_addr +" 에서\n"+ rcv_addr +" 로\n"+rcv_amt+" AAH가 발송되었습니다.\n발송 후 남은 수량 : "+ wallet_balance+"\ntransactionHash : "+receipt.transactionHash);
            });
        });
    }
}

async function fn_unlockAccount(addr){
    let rtn_result = false;
    // console.log(addr +" / 402 : "+process.env.AAH_ADDR_PWD);
    await web3.eth.personal.unlockAccount(addr, process.env.AAH_ADDR_PWD, 500).then(function (result) {
      rtn_result = result;
    //   console.log('#### 407 #### fn_unlockAccount result :' + result);
    });
    return rtn_result;
}

async function fn_send_tx_log(fromId, send_addr, rcv_addr, rcv_amt, blockNumber,contractAddress,blockHash,transactionHash, memo ){
    let strsql ="insert into sendlog (`userIdx`,`fromAddr`,`toAddr`,`toAmt`,`blockNumber`, `contractAddress` ,`blockHash`,`transactionHash`,`memo`)";
    strsql =strsql + " values ('"+fromId+"','"+send_addr+"','"+rcv_addr+"', '"+rcv_amt+"','"+blockNumber+"','"+contractAddress+"','"+blockHash+"','"+transactionHash+"','"+memo+"')";
    // console.log(strsql);
    let result = sync_connection.query(strsql);
}


function get_users_cnt(){
    let sql = "SELECT count(user_id) as cnt FROM users "
    let result = sync_connection.query(sql);
    let cnt = result[0].cnt;
    return cnt;
}
/////////////////// telegram //////////////////////
async function fn_sendMessage(chatId, chatText){
    await axios.post(`${TELEGRAM_API}/sendMessage`, {
        chat_id: chatId,
        text: chatText
    });
}

async function fn_deleteMessage(chatId, msgId){
    await axios.post(`${TELEGRAM_API}/deleteMessage`, {
        chat_id: chatId,
        message_id: msgId
    });
}

async function fn_banMember(chatId, userId){
    await axios.post(`${TELEGRAM_API}/banChatSenderChat`, {
        chat_id: chatId,
        sender_chat_id: userId
    });
    console.log("banChatSenderChat : "+userId);
}

async function fn_unbanMember(chatId, userId){
    await axios.post(`${TELEGRAM_API}/unbanChatSenderChat`, {
        chat_id: chatId,
        sender_chat_id: userId
    });
    console.log("unbanChatSenderChat : "+userId);
}

async function fn_banCheck(chatId, fromId, messageId) //
{
    if(notalklist.indexOf(fromId)>-1){
        fn_deleteMessage(chatId,messageId);
    }else{
        fn_deleteMessage(chatId,messageId);
    }

    // fn_sendMessage(chatId, '👮️ 스팸단어를 삭제 합니다(__).');
    console.log("write id : "+fromId);

    if(addUserBanYN=="Y"){
        fn_banMember(chatId,fromId);
    }
    // fn_unbanMember(chatId,fromId);
}

function fn_checkText(chatText){
    let banMsg = "";
    for (let i = 0; i < banWord.length; i++) {
        if (chatText.toLowerCase().includes(banWord[i])) {
            banMsg = banWord[i];
            return banMsg;
            break;
        }
    }
    return banMsg;
}

function getCurTimestamp() {
    const d = new Date();
  
    return new Date(
      Date.UTC(
        d.getFullYear(),
        d.getMonth(),
        d.getDate(),
        d.getHours(),
        d.getMinutes(),
        d.getSeconds()
      )
    ).toISOString().replace('T','_').replace('Z','');
}
