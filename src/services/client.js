const schema = require('../models/client')

const getAllClients = async () => {
    const result = await schema.find({});
    return result;
}

const getByClientID = async (clientID) => {
    const result = await schema.find({
        clientID : clientID
    });
    return result;
}

const addClient = async (data) => {
    const client = await schema.create(data);
    client.save();
    return client;
}

const deleteAllClients = async () => {
    const result = await schema.deleteMany({});
    return result;
}

const addWallet = async (clientID, wallet) => {
    // await deleteAllClients()
    const client = await getByClientID(clientID)

    if(client.length === 0){
        const result = await addClient({
            clientID: clientID,
            wallets: [wallet]
        })
        return result;

    }else{
        const search = client[0].wallets.find(data => data === wallet)

        if(!search) {
            client[0].wallets = [...client[0].wallets , wallet]
            client[0].save();
            return client[0];
        }else{
            return 'wallet already exits'
        }
    }
}

module.exports = {
    getAllClients,
    getByClientID,
    addClient,
    addWallet
}