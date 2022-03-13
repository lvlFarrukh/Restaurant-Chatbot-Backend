const sendMessage = async (client, message, senderID, twilioNumber) => {
    console.log(`${client} -- ${message} -- ${senderID} -- ${twilioNumber}`)
    try {
        await client.messages
            .create({
                from: twilioNumber,
                to: senderID,
                body: message,
            })
            .then(message => {
                console.log("Message: ", message)
                console.log(message.sid)
            });
            
    }   
    catch (error){
        console.log(error.message);
    }
}

export default sendMessage