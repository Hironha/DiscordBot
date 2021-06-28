import Discord from 'discord.js';
import dotenv from 'dotenv';
import { MusicHelper } from './modules/music.js';
import { Commands, Abbreviation } from './modules/commands.js';

const client = new Discord.Client();
dotenv.config();

const settings = {
  token: process.env.TOKEN,
  prefix: process.env.PREFIX
}

client.player = new MusicHelper();

client.on('ready', () => {
  console.log(`Logged in as ${client.user.tag}!`);
});

client.on('message', async (message) => {
  //caso a mensagem seja do bot
  if(message.author.bot || !message.member || !message.guild || !message.content.startsWith(`${settings.prefix}`)){
     return;
  }
  //reestruturando a string de comando
  const args = message.content.slice(settings.prefix.length).trim().split(' ');
  //pegando o comando
  const command = args.shift().toLowerCase();
  client.player.setTextChannel(message.channel);
  const method = Commands[command] || Abbreviation[command];
  if(method){
    console.log(method);
    method({ client, args, message });
    return;
  }
  const mensagem = new Discord.MessageEmbed()
    .setColor('#4169e1')
    .setTitle('Comando')
    .setDescription(`Comando ${command} inválido.`);
  client.player.sendMessage(mensagem);
});

client.login(settings.token);
