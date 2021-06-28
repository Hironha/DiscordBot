import Discord from 'discord.js';
import ytdl from 'ytdl-core-discord';
import yts from 'yt-search';
export class MusicHelper {
  constructor(){
    this.queue = [];
    this.currentTitle = '';
    this.status = 'stopped';
    this.dispatcher = null;
    this.textChannel = null;
    this.voiceChannel = null;
    this.connection = null;
  }
  //pega informações sobre a música solicitada e coloca para tocar
  async playMusic({ url, title }){
    this.status = 'playing';
    try{
      this.currentTitle = title;
      const info = await ytdl.getInfo(url, {  lang: 'en '});
      const stream = await ytdl.downloadFromInfo(info, { filter: 'audioonly' });
      this.dispatcher = this.connection.play(stream, { volume: false });
      const mensagem = new Discord.MessageEmbed()
        .setColor('#4169e1')
        .setTitle('Play')
        .setDescription(this.currentTitle);
      this.sendMessage(mensagem);
      //evento de finalização da música
      this.dispatcher.on('finish', () => {
        this.dispatcher.destroy();
        this.dispatcher = null;
        this.status = 'stopped';
        if(this.queue.length != 0){
          this.playMusic(this.queue.shift());
        }
      });
      this.dispatcher.on('error', console.error);
    } catch(error){
        console.log(error);
        this.sendMessage(`Não foi possível encontrar a música.`);
    }
  }
  //coloca a musica no array da fila
  addSongToQueue({ url, title }){
    const mensagem = new Discord.MessageEmbed()
      .setColor('#4169e1')
      .setTitle('Adicionado')
      .setDescription(title);
    this.sendMessage(mensagem);
    this.queue.push({ url, title });
  }
  //verifica o estado a queue de músicas
  checkMusicQueue(){
    //verifica se tem alguma musica tocando
    if(this.status === 'playing'){
      return;
    }
    //se não tiver nenhuma musica tocando, coloca alguma da fila
    this.playMusic(this.queue.shift());
  }
  //Coloca a musica na fila
  async queueMusic(musicLink){
    try{
      const info = await ytdl.getBasicInfo(musicLink, { lang: 'en' });
      const url = info.videoDetails.video_url;
      this.addSongToQueue({ url: url, title: info.videoDetails.title });
      this.checkMusicQueue();
    }catch(error){
      console.log(error);
      this.sendMessage(`Não encontrei a música: ${musicLink}`);
    }
  }
  //pula a música a atual para tocar a próxima
  nextMusic(voiceChannel){
    const mensagem = new Discord.MessageEmbed()
      .setColor('#4169e1')
      .setTitle('Next');

    if(this.status == 'stopped'){
      mensage.setDescription('Não estou tocando nada!');
      this.sendMessage(mensagem);
      return;
    }
    if(voiceChannel !== this.voiceChannel){
      mensage.setDescription('Você precisar estar conectado ao mesmo canal de voz que eu.');
      this.sendMessage(mensagem);
      return;
    }
    if(this.dispatcher != null){
      mensagem.setDescription(`Pulando a música ${this.currentTitle}`);
      this.sendMessage(mensagem);
      this.dispatcher.end();
      return;
    }
  }
  //Responde ao usuário as musicas em fila
  printQueue(){

    if(this.queue.length > 0){
      let arrayString = [];
      let string = '';
      for(let i = 0; i < this.queue.length; i++){
        if((string.length + this.queue[i].title.length) > 2000){
          arrayString.push(string);
          string = '';
        }
        string += `${i+1} → ${this.queue[i].title}\n`;
      }
      arrayString.push(string);
      const msg = new Discord.MessageEmbed()
        .setColor('#4169e1')
        .setTitle('Queue');
      while(arrayString.length > 0){
        msg.setDescription(arrayString.shift());
        this.sendMessage(msg);
      }
      return;
    }
    const mensagem = new Discord.MessageEmbed()
      .setColor('#4169e1')
      .setTitle('Queue');
    mensagem.setDescription('Não há músicas na fila.');
    this.sendMessage(mensagem);
  }
  //procurar a musica e depois colocar na queue
  async searchMusic(string){
    try{
      const response = await yts(string);
      const video = response.videos.shift();
      const actualLink = video.url;
      this.queueMusic(actualLink);
    } catch(error){
        this.sendMessage(`Não encontrei a música \"${string}\".`);
    }
  }
  //procura a música solicitada com a API yt-search
  async searchPlaylist(string){
    try{
      const list = await yts({ listId: string });
      list.videos.forEach((item, index) => {
        this.queue.push({ url: item.videoId, title: item.title });
      });
      const mensagem = new Discord.MessageEmbed()
        .setColor('#4169e1')
        .setTitle('Adicionadas')
        .setDescription(`Foram adicionados ${list.videos.length} músicas para a fila.`);
      if(this.status === 'stopped'){
        this.playMusic(this.queue.shift());
      }
    }catch(error){
      console.log(error);
      this.sendMessage(`Não foi possível carregar a playlist.`);
    }
  }
  pauseMusic(){
    this.dispatcher.pause();
    this.sendMessage(`Música ${this.currentTitle} pausada.`);
  }
  resumeMusic(){
    this.dispatcher.resume();
    this.sendMessage(`Música ${this.currentTitle} voltando a tocar.`);
  }
  //retorna true se estiver tocando música, caso contrario retorna falso
  isPlaying(){
    return (this.status === 'playing') ? (true) : (false);
  }
  //parar de tocar a música
  stopPlaying(){
    //se existe uma conexão
    if(this.connection){
      //se existe algo tocando
      if(this.dispatcher){
        try{
          this.currentTitle = '';
          this.status='stoppped';
          //fecha o dispatcher
          this.dispatcher.end();
          //zera a queue
          this.queue = [];
          this.connection.disconnect();
          this.voiceChannel = null;
        }catch(error){
          const mensagem = new Discord.MessageEmbed()
            .setColor('#4169e1')
            .setTitle('Stop')
            .setDescription(`Erro no comando -stop.`);
            this.sendMessage(mensagem);
        }
        return;
      }
      this.sendMessage('Não há nenhuma música tocando.');
      return;
    }
    this.sendMessage('Não estou conectado a nenhum canal de voz.');
  }
  selectMusic(index){
    const options = { message: false }
    const [removed] = this.removeMusic(index, options);
    const mensagem = new Discord.MessageEmbed()
      .setColor('#4169e1')
      .setTitle('Select');
    if(removed){
      mensagem.setDescription(`Música ${removed.title} adicionada ao começo da fila`);
      this.sendMessage(mensagem);
      this.queue.unshift(removed);
      return;
    }
    mensagem.setDescription(`Index inválido. Tente inserir um valor válido.`);
    this.sendMessage(mensagem);
  }
  getCurrentTitle(){
    return this.currentTitle;
  }
  //seta o canal de voz que o bot ta atuando
  setVoiceChannel(voiceChannel){
    this.voiceChannel = voiceChannel;
  }
  //seta o canal de voz para o bot responder
  setTextChannel(textChannel){
    this.textChannel = textChannel;
  }
  //seta conexao
  setConnection(connection){
    this.connection = connection;
  }
  removeMusic(index, options = { message: true }){
    const mensagem = new Discord.MessageEmbed()
      .setColor('#4169e1')
      .setTitle('Remove');
    if(isNumeric(index)){
      const valor = parseInt(index);
      if(valor <= this.queue.length){
        const removed = this.queue.splice(valor-1, 1);
        mensagem.setDescription(`${removed[0].title} removido da lista.`);
        (options.message) ? (this.sendMessage(mensagem)) : '';
        return removed;
      }
    }
    mensagem.setDescription(`Valor ${index} inválido. Tente inserir um valor válido.`);
    (optins.message) ? (this.sendMessage(mensagem)) : '';
    return null;
  }
  clearQueue(){
    const mensagem = new Discord.MessageEmbed()
      .setColor('#4169e1')
      .setTitle('Clear')
      .setDescription('Fila limpa.');
    this.queue = [];
    this.sendMessage(mensagem);
  }
  //Fisher–Yates shuffle algoritmo desse cara brabo
  shuffleQueue() {
    for (let i = this.queue.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [this.queue[i], this.queue[j]] = [this.queue[j], this.queue[i]];
    }
    const mensagem = new Discord.MessageEmbed()
      .setColor('#4169e1')
      .setTitle('Shuffle')
      .setDescription('Lista de músicas randomizadas.');
    this.sendMessage(mensagem);
  }
  sendMessage(mensagem){
    try{
      this.textChannel.send(mensagem);
    }catch(error){
      console.log(error);
    }
  }
}

export const isUserInVoiceChannel = (message) => {
  return !!message.member.voice.channel;
}

export const arrayToString = (array = []) => {
  let string = '';
  array.forEach((item, index) => string += item + ' ');
  return string.trim();
}

export const idFromPlaylist = (string) => {
  const index = string.lastIndexOf('list=') + 5;
  let id = '';
  for(let i = index; i < string.length && string[i] != '&'; i++){
    id += string[i];
  }
  return id;
}

const isNumeric = (string) => {
  if(typeof string != "string") return false;
  return !isNaN(string) && !isNaN(parseInt(string));
}
