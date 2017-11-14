var keyboard = new QwertyHancock({
    id: 'keyboard',
    width: 600,
    height: 150,
    octaves: 3,
    startNote: 'A3',
    whiteNotesColour: 'white',
    blackNotesColour: 'black',
    hoverColour: '#f3e939'
});

var AudioContext = window.AudioContext ||window.webkitAudioContext;
var ctx = new AudioContext();

var VoiceContainer = function(frequency){
    this.voices = [];
    this.voiceNum = document.getElementById("voices1").value;
    this.octave = document.getElementById("octave1").value;
    this.frequency = frequency * Math.pow(2, this.octave);
    this.detune = parseFloat(document.getElementById("detune1").value); 
    this.gain = ctx.createGain();
    this.filter = ctx.createBiquadFilter();
    // this.basefreq = parseInt(document.getElementById('cutoff1').value); // parseIntを噛ませないとbasefreq+envAmountがめちゃ大きくなる
    // this.basefreq = Math.pow(2.7,parseFloat(document.getElementById('cutoff1').value)); // parseIntを噛ませないとbasefreq+envAmountがめちゃ大きくなる
    this.basefreq = Math.exp(parseFloat(document.getElementById('cutoff1').value)); // parseIntを噛ませないとbasefreq+envAmountがめちゃ大きくなる
    console.log(this.basefreq);
    this.release = parseFloat(document.getElementById('release1').value);
    this.envRelease = parseFloat(document.getElementById('envrelease1').value);
    this.thatTime;
};

VoiceContainer.prototype.generateOsc = function() {
    var detuneValue = 0; // 1Voice単位でのDetuneの値
    var detuneRange = 1; 
    var postive_is_asigned = false;
    var negative_is_asigned = false;

    for(var i=0; i<this.voiceNum; i++){
        if(this.voiceNum%2 === 1 && i===0){
            // voiceNumが奇数の時、Detuneの掛かっていない中心となる音を置く
            this.voices[0] = new Voice(this.frequency,0);
            // 交互に＋に寄った音、ーに寄った音を配置する
        } else if(i%2 === 0) {
            detuneValue = this.detune * detuneRange;
            postive_is_asigned = true;
        } else {
            detuneValue = -this.detune * detuneRange;
            negative_is_asigned = true;
        }
        // detuneRangeがある値の時の＋とーの音が配置されたら
        if(postive_is_asigned && negative_is_asigned){
            detuneRange++;
            postive_is_asigned = false;
            negative_is_asigned = false;
        }

        this.voices[i] = new Voice(this.frequency,detuneValue);
    }
}

VoiceContainer.prototype.playNote = function(){
    for(var i=0; i<this.voiceNum; i++){
        this.voices[i].osc.start(0);
    }
}

VoiceContainer.prototype.stopNote = function(){
    for(var i=0; i<this.voiceNum; i++){
        this.voices[i].osc.stop(0);
        this.voices[i].osc.disconnect();    
    }
    this.gain.disconnect();
    this.filter.disconnect();
}

var Voice = function(frequency,detune){
    this.osc = ctx.createOscillator();
    this.osc.type = document.getElementById("waveform1").value;
    this.osc.frequency.value = frequency;
    this.osc.detune.value = detune;
};

VoiceContainer.prototype.updateADSR = function(node){

    // アンプのADSRの値の設定
    this.now = ctx.currentTime;
    this.attack = parseFloat(document.getElementById("attack1").value);
    this.decay = parseFloat(document.getElementById("decay1").value);
    this.sustain = parseFloat(document.getElementById("sustain1").value);
    this.maxvalue = parseFloat(document.getElementById("gain1").value);

    // フィルターエンベロープのADSRの値の設定
    this.envAttack = parseFloat(document.getElementById("envattack1").value);
    this.envDecay = parseFloat(document.getElementById("envdecay1").value);
    this.envSustain = parseFloat(document.getElementById("envsustain1").value);
    this.envAmount = parseFloat(document.getElementById("amount1").value);　

    this.filter.Q.value = document.getElementById('res1').value;
    this.filter.frequency.value = this.basefreq;

    
    // 新しくできたOscノードをGainノードに接続

    for(var i=0;i<node.voiceNum;i++){
        node.voices[i].osc.connect(node.gain);
    }
    // アンプのADSRについて
    node.gain.gain.cancelScheduledValues(0);
    node.gain.gain.setValueAtTime(0.0, this.now);
    node.gain.gain.linearRampToValueAtTime(this.maxvalue, this.now + this.attack);
    node.gain.gain.linearRampToValueAtTime(this.sustain * this.maxvalue, this.now + this.attack + this.decay);

    // フィルターエンベロープについて
    this.filter.frequency.cancelScheduledValues(0);
    this.filter.frequency.setValueAtTime(this.basefreq, this.now);

    if(this.basefreq+this.envAmount > 22050){
        this.filter.frequency.exponentialRampToValueAtTime(22050, this.now + this.envAttack);
    } else if (this.basefreq+this.envAmount < 0){
        this.filter.frequency.exponentialRampToValueAtTime(1, this.now + this.envAttack);
    } else {
        this.filter.frequency.exponentialRampToValueAtTime(this.basefreq+this.envAmount, this.now + this.envAttack);
    }

    if(this.envSustain+1 * this.basefreq > 22050){
        this.filter.frequency.exponentialRampToValueAtTime(22050, this.now + this.envAttack + this.envDecay);
    } else if(this.envSustain+1 * this.basefreq < 0){
        this.filter.frequency.exponentialRampToValueAtTime(1, this.now + this.envAttack + this.envDecay);
    } else {
        this.filter.frequency.exponentialRampToValueAtTime(this.envSustain+1 * this.basefreq, this.now + this.envAttack + this.envDecay);
    }

    node.gain.connect(this.filter);
    this.filter.connect(masterGain);
};

var LFOcontainer = function(){
    this.lfo = ctx.createOscillator();
    this.lfoGain = ctx.createGain();

    this.lfo.type = "sine";
    this.lfo.connect(this.lfoGain);
    this.lfo.start(0);
};

LFOcontainer.prototype.update = function(VContainer){
    this.lfo.frequency.value = parseFloat(document.getElementById("rate1").value);
    this.lfoGain.gain.value = 0;
    this.connectsTo = document.getElementById("connectTo1").value;

    if(this.connectsTo === "None"){
        this.lfoGain.gain.value = 0;
    } else {
        this.lfoGain.gain.value = document.getElementById("lfoGain1").value;
    }
    
    if(this.connectsTo === "Oscillator"){
        for(var i=0;i<VContainer.voiceNum;i++){
            this.lfoGain.connect(VContainer.voices[i].osc.frequency);
        }
    }

    if(this.connectsTo === "Filter"){
        this.lfoGain.connect(VContainer.filter.frequency);
    }
};
var masterGain = ctx.createGain();

masterGain.connect(ctx.destination);



var nodes = []; // 演奏されているノードを格納（減衰中のものは除く->relelasing_nodeに格納）
var releasing_nodes = []; // 減衰している音のノードを格納

keyboard.keyDown = function (note, frequency) {
    
    var node = new VoiceContainer(frequency);
    var lfo = new LFOcontainer();

    node.generateOsc();
    node.updateADSR(node);
    lfo.update(node);
    node.playNote();

    nodes.push(node);
    
    masterGain.gain.value = 0.7;
    masterGain.gain.value /= Math.sqrt(nodes.length + 1.0);  
}

keyboard.keyUp = function (note, frequency) {
    var new_nodes = [];
    // Release
    // KeyUpされなかったnode -> new_nodes -> nodes
    // KeyUpされたnode -> releaseing_nodes -> 減衰が終われば、切る(stopNote())
    for(var i=0; i<nodes.length; i++){
        if(nodes[i].frequency === frequency * Math.pow(2,nodes[i].octave)){
            nodes[i].gain.gain.cancelScheduledValues(0);
            nodes[i].gain.gain.linearRampToValueAtTime(0.0,ctx.currentTime+nodes[i].release);
            
            nodes[i].filter.frequency.cancelScheduledValues(0);
            nodes[i].filter.frequency.linearRampToValueAtTime(nodes[i].basefreq, ctx.currentTime+nodes[i].envRelease);
            nodes[i].thatTime = ctx.currentTime;
            releasing_nodes.push(nodes[i]);
            
        } else {
            new_nodes.push(nodes[i]);
        }
    }
    // 音を鳴らした時から変数Release分の時間が経てば、その音のノードを切る
    for(var i=0;i<releasing_nodes.length;i++){
        if(ctx.currentTime - releasing_nodes[i].thatTime > releasing_nodes[i].release){

            releasing_nodes[i].stopNote();
            releasing_nodes.splice(i,1);
        }

    }
    
    nodes = new_nodes;
}