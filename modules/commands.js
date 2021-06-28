import Discord from 'discord.js';
import { isUserInVoiceChannel, arrayToString, idFromPlaylist } from './music.js';

export const Commands = {
  async play({ client, args, message, ...rest }){
    const mensagem = new Discord.MessageEmbed()
      .setColor('#4169e1')
      .setTitle('Play');
    if(args == ''){
      mensagem.setDescription('Você precisa me dizer qual a música!');
      client.player.sendMessage(mensagem);
      return;
    }
    if(!isUserInVoiceChannel(message)){
      mensagem.setDescription('Você precisar estar conectado a um canal de voz.');
      client.player.sendMessage(mensagem);
      return;
    }
    //se o canal de voz do requisitante for diferente do canal do bot
    if(message.member.voice.channel != client.player.voiceChannel){
      //se estiver tocando alguma coisa
      if(client.player.isPlaying()){
        mensagem.setDescription('Estou ocupando tocando música para outro.');
        client.player.sendMessage(mensagem);
        return;
      }
      //conecta ao canal do requisitante caso não esteja fazendo nada no outro canal
      const connection = await message.member.voice.channel.join();
      client.player.setConnection(connection);
      client.player.setVoiceChannel(message.member.voice.channel);
    }
    try{
      //se for uma playlist
      if(args[0].match(/list=/) && args[0].match(/youtube.com/)){
        const id = idFromPlaylist(args[0]);
        client.player.searchPlaylist(id);
        return;
      }
      //se for um link
      if(args.length == 1 && (args[0].match(/.com/g))){
        const musicLink = args;
        client.player.playMusic({ url: musicLink, title: '' });
        return;
      }
      const musicLink = arrayToString(args);
      client.player.searchMusic(musicLink);
    } catch(error){
      mensagem.setDescription('Aconteceu algum problema.');
      client.player.sendMessage(mensagem);
    }
  },
  next({ client, message, ...rest }){
    client.player.nextMusic(message.member.voice.channel);
  },
  pause({ client, ...rest }){
    client.player.pauseMusic();
  },
  stop({ client, ...rest }){
    client.player.stopPlaying();
  },
  shuffle({ client, ...rest }){
    client.player.shuffleQueue();
  },
  commands({ client, ...rest }){
    const mensagem = new Discord.MessageEmbed()
      .setColor('#4169e1')
      .setTitle('Comandos')
      .setDescription('Comandos: -play ou -p, -queue ou -q, -shuffle, -remove, -music, -stop, -next ou -n, -select.');
    client.player.sendMessage(mensagem);
  },
  music({ client, ...rest }){
    const mensagem = new Discord.MessageEmbed()
      .setColor('#4169e1')
      .setTitle('Music')
      .setDescription(`Tocando ${client.player.getCurrentTitle()}`);
    client.player.sendMessage(mensagem);
  },
  resume({ client, ...rest }){
    client.player.resumeMusic();
  },
  clear({ client, ...rest }){
    client.player.clearQueue();
  },
  remove({ client, args, ...rest }){
    client.player.removeMusic(args[0].trim(), { message: true });
  },
  queue({ client, ...rest }){
    client.player.printQueue();
  },
  select({ client, args, ...rest }){
    client.player.selectMusic(args[0].trim());
  }
};

export const Abbreviation = {
  p: Commands.play,
  n: Commands.next,
  q: Commands.queue,
};
