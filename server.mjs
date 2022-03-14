import express from 'express';
import bodyParser from 'body-parser';
import twilio from 'twilio';
import cors from "cors";
import "dotenv/config";
import "./config/db.mjs";
import sendMessage from './utiles/whatsappSendMessage.mjs'
import textQueryRequestResponse, {generateOrderId} from './utiles/DialogflowHelper.mjs'
import { WebhookClient, Card, Suggestion, Image, Payload } from 'dialogflow-fulfillment';
import {dialogflow, SignIn} from 'actions-on-google';
import morgan from 'morgan';
// modals
import Order from "./modal/Order.mjs";
import Cart from "./modal/Cart.mjs";

const app = express();
const PORT = process.env.PORT || 3001;
const twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
const google_app = dialogflow({
    clientId: process.env.GOOGLE_CLIENT_ID,
});

app.use(morgan('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cors({
    origin: '*'
}));

app.get('/', (req, res) => {
    res.send("Server is running")
})

//! Twilio messeging end point
app.post("/twiliowebhook", (req, res) => {

    // console.log("req: ", JSON.stringify(req.body));

    console.log("message: ", req.body.Body);

   // TODO: ask dialogflow what to respond
   
   
    let twiml = new twilio.twiml.MessagingResponse()
    twiml.message('The Robots are coming! Head for the hills!');

    res.header('Content-Type', 'text/xml');
    res.send(twiml.toString());
})

//! Whatsapp webhook
app.post("/whatsappwebhook", (req, res) => {
    let message = req.body.Body;
    let senderID = req.body.From;

    console.log(`${message} --- ${senderID} --- ${process.env.TWILIO_NUMBER}`)

    sendMessage(twilioClient, "Hello From Pc", senderID, process.env.TWILIO_NUMBER)
})

//! Dialogflow response endpoint
app.post("/talktochatbot", async (req, res) => {
    res.header("Access-Control-Allow-Origin", "*");

    
    const {responses} = await textQueryRequestResponse(
        process.env.DIALOGFLOW_PROJECT_ID,
        req.body.text,
        'en-US'
    )
   
    console.log("responses: ", responses[0]?.queryResult?.fulfillmentMessages)
    res.send({
        text: responses[0].queryResult.fulfillmentText
    });

})

//! Webhook endpoint for dialogflow
app.post("/dialogwebhook", async (req, res) => {

    const agent = new WebhookClient({ request: req, response: res });

    //! Wellcome intent
    function welcome(agent) {

        

        // let image = new Image("https://media.nationalgeographic.org/assets/photos/000/263/26383.jpg");
        // agent.add(image)

        // agent.add(` //ssml
        //     <speak>
        //         <prosody rate="slow" pitch="-2st">Can you hear me now?</prosody>
        //     </speak>
        // `);

        agent.add('Welcome to ABC Restaurant.');
        agent.add('I am your virtual assistance. You can ask me about menu.');
        agent.add(new Suggestion('Show menu'));

        // const facebookSuggestionChip = [{
        //     "content_type": "text",
        //     "title": "I am quick reply",
        //     // "image_url": "http://example.com/img/red.png",
        //     // "payload":"<DEVELOPER_DEFINED_PAYLOAD>"
        // },
        // {
        //     "content_type": "text",
        //     "title": "I am quick reply 2",
        //     // "image_url": "http://example.com/img/red.png",
        //     // "payload":"<DEVELOPER_DEFINED_PAYLOAD>"
        // }]
        // const payload = new Payload(
        //     'FACEBOOK',
        //     facebookSuggestionChip
        // );
        // agent.add(payload)

    }

    function showMenu(agent) {
        const dishes = [
            `Chicken kharai`,
            `Beef kharai`,
            `Seek kabab`,
            `Gola kabab`,
        ]

        agent.add('In ABC Restaurant we have following dishes:');
        dishes.map((dish, index) => {
            agent.add(`${index + 1}- ${dish}`);
        })
        agent.add('What you want to order?');

        dishes.map((dish, index) => {
            agent.add(new Suggestion(`I want to order ${dish}`));
        })

    }

    async function order(agent) {
        const slots = agent.parameters;

        if (slots?.dish && slots?.quantity) {

            let cart = await Cart.findOneAndUpdate(
                { customerEmail: 'test@gmail.com' },
                {
                  customerEmail: 'test@gmail.com',
                  customerName: 'test user',
                  $push: {
                    items: [
                      {
                        dishName: slots?.dish,
                        quantity: Number(slots?.quantity),
                      },
                    ],
                  },
                },
                { upsert: true }
              ).exec();

            agent.add(`${slots.dish} for ${slots.quantity} person is added in your cart.`);
            agent.add(`You want cold drink?`);
            agent.add(new Suggestion('Yes'));
            agent.add(new Suggestion('No'));
            agent.add(new Suggestion('Show cart'));
        }

    }

    async function coldDrink_yes(agent) {
        const slots = agent.parameters;
        console.log(slots)

        if (slots?.coldDrinkSize && slots?.coldDrinkFlavour) {

            try {
                let cart = await Cart.findOneAndUpdate(
                    { customerEmail: 'test@gmail.com' },
                    {
                        customerEmail: 'test@gmail.com',
                        customerName: 'test user',
                        $push: {
                            baverages: [
                                {
                                    beverageFlavour: slots?.coldDrinkFlavour,
                                    size: slots?.coldDrinkSize,
                                },
                            ],
                        },
                    },
                    { upsert: true }
                ).exec();
            }
            catch(err) {
                console.log('error2', err)
            }

            agent.add(`${slots.coldDrinkSize} Size cold drink is added in your cart.`);
            agent.add(`Say checkout if you want to checkout`);
            agent.add(`Say show menu If you want to see menu`);
            agent.add(new Suggestion('checkout'));
            agent.add(new Suggestion('show menu'));
        }
    }

    async function showCart(agent) {
        try {
            let cart = await Cart.find({
                customerEmail:'test@gmail.com'
            }).exec();

            console.log('cart: ', cart)
    
            if (
                (cart[0]?.items?.length === 0 && cart[0]?.baverages?.length === 0) ||
                !cart ||
                cart.length === 0
            ) {
                agent.add('Your cart is empty.');
            }
            else {
                agent.add('Your cart is:');
                agent.add('Dishes:')
                cart[0]?.items?.map((item, index) => {
                    agent.add(`${index + 1}- ${item.dishName} ${item.quantity} person`);
                })

                cart[0]?.baverages.length !== 0 && agent.add('Cold Drink:')
                cart[0]?.baverages?.map((item, index) => {
                    agent.add(`${index + 1}- Flavour: ${item.beverageFlavour} Size: ${item.size}`);
                })

            }
        }
        catch (error) {
            console.log(error)
            agent.add('Something went wrong.');
        }
    }

    function clearCart(agent) {
        agent.add('Are you sure you want to clear your cart?');
    }

    function checkout(agent) {
        agent.add('Are you sure you want to checkout?');
    }

    async function checkout_yes(agent) {
        try {
            let cart = await Cart.find({customerEmail: "test@gmail.com"})
            console.log(cart[0])

            if (
                (cart[0]?.items?.length === 0 && cart[0]?.baverages?.length === 0) ||
                !cart ||
                cart.length === 0
            ) {
                agent.add('Your cart is empty.');
                agent.add('Say show menu if you want to see menu');
                agent.add(new Suggestion('show menu'));
            }
            else {
                let order = new Order({
                    customerName: cart[0]?.customerName,
                    customerEmail: cart[0]?.customerEmail,
                    items: cart[0]?.items,
                    beverages: cart[0]?.baverages,
                    orderId: generateOrderId(),
                })
                order = await order.save()

                if (order) {
                    await Cart.deleteOne({customerEmail: "test@gmail.com"})
                    agent.add('Your order is confirmed.');
                    agent.add('Thank you for visiting ABC Restaurant.');
                    agent.add('Say show menu if you want to see menu');
                    agent.add(new Suggestion('show menu'));
                }

                else {
                    agent.add('Something went wrong.');
                }
            }
        }
        catch(err) {
            console.log('error2', err)
        }
    }

    async function showOrderStatus(agent) {
        const slots = agent.parameters;
        console.log(slots)

        if (slots?.orderId) {
            let order = await Order.findOne({orderId: slots?.orderId})
            if (order) {
                agent.add(`Status of your order is ${order.status}`);
                order.waitingTime !== '0' && agent.add(`Your order will be delivered in ${order.waitingTime} minutes.`);
                agent.add('Say show menu if you want to see menu');
                agent.add(new Suggestion('show menu'));
            }
            else {
                agent.add('Your order is not found.');
            }

        }
    }

    async function clearCart_yes(agent) {
        try {
            let cart = await Cart.findOneAndUpdate(
                { customerEmail: 'test@gmail.com' },
                {
                    customerEmail: 'test@gmail.com',
                    customerName: 'test user',
                    items: [],
                    baverages: [],
                },
                { upsert: true }
            ).exec();
        }
        catch(err) {
            console.log('error2', err)
        }
        agent.add('Your cart is cleared.');
        agent.add('Say show menu If you want to see menu');
        agent.add(new Suggestion('show menu'));
    }

    //! falback intent
    function fallback(agent) {
        agent.add('Woah! Its getting a little hot in here.');
        agent.add(`I didn't get that, can you try again?`);
    }

    let intentMap = new Map(); // Map functions to Dialogflow intent names
    intentMap.set('Default Welcome Intent', welcome);
    intentMap.set('Default Fallback Intent', fallback);
    intentMap.set('showMenu', showMenu);
    intentMap.set('order', order);
    intentMap.set('showCart', showCart);
    intentMap.set('coldDrink_yes', coldDrink_yes);
    intentMap.set('clearCart_yes', clearCart_yes);
    intentMap.set('clearCart', clearCart);
    intentMap.set('checkout', checkout);
    intentMap.set('checkout_yes', checkout_yes);
    intentMap.set('showOrderStatus', showOrderStatus);

    agent.handleRequest(intentMap);

})


app.listen(PORT, () => {
    console.log(`server is running on port ${PORT}`);
});
