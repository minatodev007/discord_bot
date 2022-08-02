if (Number(process.version.slice(1).split(".")[0]) < 16)
  throw new Error("Node 16.x or higher is required. Update Node on your system.");

require("dotenv").config();

const { intents, partials, permLevels, CLUSTER_API } = require("./config.js");

// Load up the discord.js library
const { Client, Collection } = require("discord.js");

// We also load the rest of the things we need in this file:
const { readdirSync } = require("fs");

const logger = require("./modules/Logger.js");

// Database Connection
const { connect } = require("./modules/connect.js")
connect();

const customerService = require('./services/client');
const serverService = require('./services/admin');

const { STAKING_NFTs } = require('./constants');
const { SolanaClient, SolanaClientProps } = require("./helpers/sol");

const solanaClient = new SolanaClient({rpcEndpoint: CLUSTER_API} as typeof SolanaClientProps);

// This is your client. Some people call it `bot`, some people call it `self`,
// some might call it `cootchie`. Either way, when you see `client.something`,
// or `bot.something`, this is what we're referring to. Your client.
const client = new Client({ intents, partials });

// Aliases, commands and slash commands are put in collections where they can be
// read from, catalogued, listed, etc.
const commands = new Collection();
const aliases = new Collection();
const slashcmds = new Collection();

// Generate a cache of client permissions for pretty perm names in commands.
const levelCache = {};
for (let i = 0; i < permLevels.length; i++) {
  const thisLevel = permLevels[i];
  levelCache[thisLevel.name] = thisLevel.level;
}

// To reduce client pollution we'll create a single container property
// that we can attach everything we need to.
client.container = {
  commands,
  aliases,
  slashcmds,
  levelCache
};

const reallocationRole = async () => {
  console.log('Start Reallocation Role...');

  let customers = await customerService.getAllClients();
  let servers = await serverService.getAllServers();

  for(let i = 0; i < customers.length; i++){
    let userInfo = customers[i].toJSON();

    for(let j = 0; j < servers.length; j++){
      let serverInfo = servers[j].toJSON();

      let guild = client.guilds.cache.get(serverInfo.serverID);

      let member = guild.members.cache.get(userInfo.clientID);

      if(!member)
      continue;

      addRoleByNFT(member, guild, userInfo, serverInfo);
    }
  }
}

const validateServerInfo = (guild, serverInfo) => {
  let valid = true;
  if(serverInfo.roleType){
    serverInfo.amounts.map(amount => {
      const amountRole = guild.roles.cache.find(role => role.name === amount.role);
      if(!amountRole) valid = false;
    });

  }else{
    serverInfo.attributes.map(attr => {
      let attrRole = guild.roles.cache.find(role => role.name === attr.role);
      if(!attrRole) valid = false;
    });
  }
  return valid;
}

const addRoleByNFT = async (member, guild, userInfo, serverInfo) => {

  const nftList = await solanaClient.getAllCollectibles(
    userInfo.wallets,
    [
      { updateAuthority: serverInfo.updateAuthority, collectionName: serverInfo.collectionName}
    ]
  );

  const stakeList = await solanaClient.getAllCollectiblesFromMintAddress(STAKING_NFTs, 
    [
      { updateAuthority: serverInfo.updateAuthority, collectionName: serverInfo.collectionName}      
    ]
  );

  for( const nftWallet in nftList ) {
    for( const stakeWallet in stakeList ) {
      if( nftWallet === stakeWallet ) {
        nftList[nftWallet] = [...nftList[nftWallet], ...stakeList[stakeWallet]];
      }
    }
  }

  const result = validateServerInfo(guild, serverInfo);
  if(!result){
    console.log(`"${guild.name} - ${guild.id}" Server Info is not correct. Please check your NFT Role Name.`);
    return;
  }

  if(serverInfo.roleType){

    // Add Role according to total nft count
    let total = 0;
    for (const wallet in nftList){
      total += nftList[wallet].length;
    }
    
    if(total === 0){
      console.log(`"${member.user.username} #${member.user.discriminator}- ${member.user.id}" A user doesn't have any NFT.`)
      return;
    }

    let newRoleName = '';
    let currentRole = [];

    serverInfo.amounts.map(amount => {
        if(parseInt(amount.count) <= total)
        {
          const amountRole = guild.roles.cache.find(role => role.name === amount.role);

          if(member.roles.cache.has(amountRole.id)){ currentRole.push(amountRole.id)}

          newRoleName = amount.role;
        }
    });

    let newRole = guild.roles.cache.find(role => role.name === newRoleName);

    if(member.roles.cache.has(newRole.id)) {
      return;
    }

    member.roles.add(newRole.id);

    if(currentRole.length > 0){
      currentRole.map(temp => member.roles.remove(temp));
    }

    return;

  }else{
    // Add Role By NFT Attributes.
    let currentRole = [];
    let newRole = [];

    serverInfo.attributes.map(attr => {

      let attrRole = guild.roles.cache.find(role => role.name === attr.role);

      if(member.roles.cache.has(attrRole.id)) {
        currentRole.push(attrRole.id);
      }

      for (const wallet in nftList){
        nftList[wallet].map(nft => {
          nft.attributes.map(nftAttr => {
            if(nftAttr.trait_type.toLowerCase() === attr.trait_type.toLowerCase() && nftAttr.value.toLowerCase() === attr.value.toLowerCase()){
              if(!newRole.includes(attrRole.id))
                newRole.push(attrRole.id);
            }
          })
        })
      }

    });
    
    newRole.map(value => {
      if(!currentRole.includes(value))
        console.log(`"${member.user.username} #${member.user.discriminator}- ${member.user.id}" Role ID :  ${value}.`)
        member.roles.add(value);
    });

    currentRole.map(value => {
      if(!newRole.includes(value))
        member.roles.remove(value);
    });

  }
}


const init = async () => {

  // // Here we load **commands** into memory, as a collection, so they're accessible
  // // here and everywhere else.
  // const commands = readdirSync("./src/commands/").filter(file => file.endsWith(".js"));
  // for (const file of commands) {
  //   const props = require(`./commands/${file}`);
  //   logger.log(`Loading Command: ${props.help.name}. 👌`, "log");
  //   client.container.commands.set(props.help.name, props);
  //   props.conf.aliases.forEach(alias => {
  //     client.container.aliases.set(alias, props.help.name);
  //   });
  // }

  // // Now we load any **slash** commands you may have in the ./slash directory.
  // const slashFiles = readdirSync("./src/slash").filter(file => file.endsWith(".js"));
  // for (const file of slashFiles) {
  //   const command = require(`./slash/${file}`);
  //   const commandName = file.split(".")[0];
  //   logger.log(`Loading Slash command: ${commandName}. 👌`, "log");

  //   // Now set the name of the command with it's properties.
  //   client.container.slashcmds.set(command.commandData.name, command);
  // }

  client.on('messageReactionAdd', async (reaction, user) => {

    if (reaction.emoji.name === '✅') {

      console.log("Reaction Start");

      const message = reaction.message;
    
      const userData = await customerService.getByClientID(user.id);
      if(userData.length < 1) {
        console.log(`${user.id} User Does Not Exist.`)
        return;
      }
      const userInfo = userData[0].toJSON();

      const serverData = await serverService.getByServerID(message.guildId);
      if(serverData.length < 1) {
        console.log(`${message.guildId} Server Does Not Exist.`);
        return;
      }
      const serverInfo = serverData[0].toJSON();

      const verifyChannel = message.guild.channels.cache.find(channel => channel.name === serverInfo.channelName);

      if(!verifyChannel) {
        console.log(`"${message.guild.name} - ${message.guild.id}" Verify Channel Does Not Exist!`);
        return;
      }

      if(message.channelId === verifyChannel.id)
      {


        let member = message.guild.members.cache.get(user.id);

        addRoleByNFT(member, message.guild, userInfo, serverInfo);
      }
    }
  });

  
  client.on('ready', function(){
    console.log('The Bot is ready');
    // console.log(client.user.username);
    setInterval(function(){
      reallocationRole();
    }, 1800000);
  });

  // // Then we load events, which will include our message and ready event.
  // const eventFiles = readdirSync("./src/events/").filter(file => file.endsWith(".js"));
  // for (const file of eventFiles) {
  //   const eventName = file.split(".")[0];
  //   logger.log(`Loading Event: ${eventName}. 👌`, "log");
  //   const event = require(`./events/${file}`);
  //   // Bind the client to any event, before the existing arguments
  //   // provided by the discord.js event. 
  //   // This line is awesome by the way. Just sayin'.
  //   client.on(eventName, event.bind(null, client));
  // }

  // // Threads are currently in BETA.
  // // This event will fire when a thread is created, if you want to expand
  // // the logic, throw this in it's own event file like the rest.
  // client.on("threadCreate", (thread) => thread.join());

  // Here we login the client.
  client.login(process.env.BOT_TOKEN);

};

init();
