const schema = require('../models/server')

const getAllServers = async () => {
    const result = await schema.find({});
    return result;
}

const getByServerID = async (serverID) => {
    const result = await schema.find({
        serverID : serverID
    });
    return result;
}

const createServer = async (data) => {
    const result = await schema.create(data);
    result.save();
    return result;
}

const deleteAllServers = async () => {
    const result = await schema.deleteMany({});
    return result;
}

const deleteServer = async (serverID) => {
    const result = await schema.deleteMany({
        serverID: serverID
    })
    return result;
}

const editServer = async (data) => {
    const server = await getByServerID(data.serverID);

    if(server.length != 0){
        
        server[0].serverID = data.serverID
        server[0].channelName = data.channelName
        server[0].collectionName = data.collectionName
        server[0].roleType = data.roleType
        server[0].attributes = data.attributes

        server[0].save();
        return server[0];
    }
}

module.exports = {
    createServer,
    editServer,
    getAllServers,
    getByServerID,
    deleteServer
}