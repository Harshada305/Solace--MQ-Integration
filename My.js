const ibmMq = require('ibmmq');
const solace = require('@solace/solclientjs');

const ibmMqQueueManager = 'YOUR_QUEUE_MANAGER';
const ibmMqQueueName = 'YOUR_QUEUE_NAME';
const ibmMqChannel = 'YOUR_CHANNEL';
const ibmMqConnString = 'YOUR_CONNECTION_STRING';
const solaceUrl = 'YOUR_SOLACE_URL';
const solaceUsername = 'YOUR_SOLACE_USERNAME';
const solacePassword = 'YOUR_SOLACE_PASSWORD';
const solaceTopic = 'YOUR_TOPIC_NAME';

const ibmMqOptions = {
    qMgr: ibmMqQueueManager,
    channel: ibmMqChannel,
    conn: ibmMqConnString,
};

function connectToIbmMq() {
    return new Promise((resolve, reject) => {
        ibmMq.Connx(ibmMqOptions.qMgr, { Channel: ibmMqOptions.channel, ConnectionName: ibmMqOptions.conn }, (err, hConn) => {
            if (err) {
                return reject(err);
            }
            resolve(hConn);
        });
    });
}

async function runIntegration() {
    // Initialize Solace
    solace.SolclientFactory.init({
        'logLevel': solace.LogLevel.INFO,
    });

    const solaceSession = solace.SolclientFactory.createSession({
        url: solaceUrl,
        username: solaceUsername,
        password: solacePassword,
    });

    try {
        await solaceSession.connect();
        console.log('Connected to Solace.');

        const ibmConn = await connectToIbmMq();
        console.log('Connected to IBM MQ.');

        const hObj = ibmMq.Open(ibmMqOptions.qMgr, ibmMqOptions.queueName, ibmMq.MQOO_INPUT_AS_Q_DEF, (err) => {
            if (err) {
                console.error('Error opening queue:', err);
            }
        });

        // Start consuming messages
        const getMsg = () => {
            ibmMq.Get(hObj, {}, (err, message) => {
                if (err) {
                    console.error('Error getting message:', err);
                    return;
                }

                const msgBody = message.getData().toString();
                console.log('Received message from IBM MQ:', msgBody);

                // Publish to Solace
                const solaceMessage = solace.SolclientFactory.createMessage();
                solaceMessage.setDestination(solace.SolclientFactory.createTopic(solaceTopic));
                solaceMessage.setBinaryAttachment(Buffer.from(msgBody));
                solaceSession.send(solaceMessage);
                console.log('Published message to Solace.');

                // Continue fetching messages
                getMsg();
            });
        };

        getMsg();
    } catch (error) {
        console.error('Error in integration:', error);
    }
}

runIntegration();
