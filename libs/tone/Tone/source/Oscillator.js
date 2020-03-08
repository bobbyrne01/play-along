import Tone from "../core/Tone";
import "../signal/Signal";
import "../source/Source";
import "../core/Transport";
import "../source/OscillatorNode";

/**
 *  @class Tone.Oscillator supports a number of features including
 *         phase rotation, multiple oscillator types (see Tone.Oscillator.type),
 *         and Transport syncing (see Tone.Oscillator.syncFrequency).
 *
 *  @constructor
 *  @extends {Tone.Source}
 *  @param {Frequency} [frequency] Starting frequency
 *  @param {string} [type] The oscillator type. Read more about type below.
 *  @example
 * //make and start a 440hz sine tone
 * var osc = new Tone.Oscillator(440, "sine").toMaster().start();
 */
Tone.Oscillator = function(){

	var options = Tone.defaults(arguments, ["frequency", "type"], Tone.Oscillator);
	Tone.Source.call(this, options);

	/**
	 *  the main oscillator
	 *  @type {OscillatorNode}
	 *  @private
	 */
	this._oscillator = null;

	/**
	 *  The frequency control.
	 *  @type {Frequency}
	 *  @signal
	 */
	this.frequency = new Tone.Signal(options.frequency, Tone.Type.Frequency);

	/**
	 *  The detune control signal.
	 *  @type {Cents}
	 *  @signal
	 */
	this.detune = new Tone.Signal(options.detune, Tone.Type.Cents);

	/**
	 *  the periodic wave
	 *  @type {PeriodicWave}
	 *  @private
	 */
	this._wave = null;

	/**
	 *  The partials of the oscillator
	 *  @type {Array}
	 *  @private
	 */
	this._partials = options.partials;

	/**
	 *  The number of partials to limit or extend the periodic wave by
	 *  @type {Number}
	 *  @private
	 */
	this._partialCount = options.partialCount;

	/**
	 *  the phase of the oscillator
	 *  between 0 - 360
	 *  @type {number}
	 *  @private
	 */
	this._phase = options.phase;

	/**
	 *  the type of the oscillator
	 *  @type {string}
	 *  @private
	 */
	this._type = options.type;

	//setup
	if (options.partialCount && options.type !== Tone.Oscillator.Type.Custom){
		this._type = this.baseType + options.partialCount.toString();
	}
	this.phase = this._phase;
	this._readOnly(["frequency", "detune"]);
};

Tone.extend(Tone.Oscillator, Tone.Source);

/**
 *  the default parameters
 *  @type {Object}
 */
Tone.Oscillator.defaults = {
	"type" : "sine",
	"frequency" : 440,
	"detune" : 0,
	"phase" : 0,
	"partials" : [],
	"partialCount" : 0
};

/**
 *  The Oscillator types
 *  @enum {String}
 */
Tone.Oscillator.Type = {
	Sine : "sine",
	Triangle : "triangle",
	Sawtooth : "sawtooth",
	Square : "square",
	Custom : "custom"
};

/**
 *  start the oscillator
 *  @param  {Time} [time=now]
 *  @private
 */
Tone.Oscillator.prototype._start = function(time){
	this.log("start", time);
	//new oscillator with previous values
	var oscillator = new Tone.OscillatorNode();
	this._oscillator = oscillator;
	if (this._wave){
		this._oscillator.setPeriodicWave(this._wave);
	} else {
		this._oscillator.type = this._type;
	}
	//connect the control signal to the oscillator frequency & detune
	this._oscillator.connect(this.output);
	this.frequency.connect(this._oscillator.frequency);
	this.detune.connect(this._oscillator.detune);

	//start the oscillator
	time = this.toSeconds(time);
	this._oscillator.start(time);
};

/**
 *  stop the oscillator
 *  @private
 *  @param  {Time} [time=now] (optional) timing parameter
 *  @returns {Tone.Oscillator} this
 */
Tone.Oscillator.prototype._stop = function(time){
	this.log("stop", time);
	if (this._oscillator){
		time = this.toSeconds(time);
		this._oscillator.stop(time);
	}
	return this;
};

/**
 * Restart the oscillator. Does not stop the oscillator, but instead
 * just cancels any scheduled 'stop' from being invoked.
 * @param  {Time=} time
 * @return {Tone.Oscillator}      this
 */
Tone.Oscillator.prototype.restart = function(time){
	if (this._oscillator){
		this._oscillator.cancelStop();
	}
	this._state.cancel(this.toSeconds(time));
	return this;
};

/**
 *  Sync the signal to the Transport's bpm. Any changes to the transports bpm,
 *  will also affect the oscillators frequency.
 *  @returns {Tone.Oscillator} this
 *  @example
 * Tone.Transport.bpm.value = 120;
 * osc.frequency.value = 440;
 * //the ration between the bpm and the frequency will be maintained
 * osc.syncFrequency();
 * Tone.Transport.bpm.value = 240;
 * // the frequency of the oscillator is doubled to 880
 */
Tone.Oscillator.prototype.syncFrequency = function(){
	Tone.Transport.syncSignal(this.frequency);
	return this;
};

/**
 *  Unsync the oscillator's frequency from the Transport.
 *  See Tone.Oscillator.syncFrequency
 *  @returns {Tone.Oscillator} this
 */
Tone.Oscillator.prototype.unsyncFrequency = function(){
	Tone.Transport.unsyncSignal(this.frequency);
	return this;
};

/**
 * The type of the oscillator: either sine, square, triangle, or sawtooth. Also capable of
 * setting the first x number of partials of the oscillator. For example: "sine4" would
 * set be the first 4 partials of the sine wave and "triangle8" would set the first
 * 8 partials of the triangle wave.
 * <br><br>
 * Uses PeriodicWave internally even for native types so that it can set the phase.
 * PeriodicWave equations are from the
 * [Webkit Web Audio implementation](https://code.google.com/p/chromium/codesearch#chromium/src/third_party/WebKit/Source/modules/webaudio/PeriodicWave.cpp&sq=package:chromium).
 *
 * @memberOf Tone.Oscillator#
 * @type {string}
 * @name type
 * @example
 * //set it to a square wave
 * osc.type = "square";
 * @example
 * //set the first 6 partials of a sawtooth wave
 * osc.type = "sawtooth6";
 */
Object.defineProperty(Tone.Oscillator.prototype, "type", {
	get : function(){
		return this._type;
	},
	set : function(type){
		var isBasicType = [Tone.Oscillator.Type.Sine, Tone.Oscillator.Type.Square, Tone.Oscillator.Type.Triangle, Tone.Oscillator.Type.Sawtooth].includes(type);
		if (this._phase === 0 && isBasicType){
			this._wave = null;
			this._partialCount = 0;
			//just go with the basic approach
			if (this._oscillator !== null){
				this._oscillator.type = type;
			}
		} else {
			var coefs = this._getRealImaginary(type, this._phase);
			var periodicWave = this.context.createPeriodicWave(coefs[0], coefs[1]);
			this._wave = periodicWave;
			if (this._oscillator !== null){
				this._oscillator.setPeriodicWave(this._wave);
			}
		}
		this._type = type;
	}
});

/**
 * The oscillator type without the partialsCount appended to the end
 * @memberOf Tone.Oscillator#
 * @type {string}
 * @name baseType
 * @example
 * osc.type = 'sine2'
 * osc.baseType //'sine'
 * osc.partialCount = 2
 */
Object.defineProperty(Tone.Oscillator.prototype, "baseType", {
	get : function(){
		return this._type.replace(this.partialCount, "");
	},
	set : function(baseType){
		if (this.partialCount && this._type !== Tone.Oscillator.Type.Custom && baseType !== Tone.Oscillator.Type.Custom){
			this.type = baseType + this.partialCount;
		} else {
			this.type = baseType;
		}
	}
});

/**
 * 'partialCount' offers an alternative way to set the number of used partials. 
 * When partialCount is 0, the maximum number of partials are used when representing
 * the waveform using the periodicWave. When 'partials' is set, this value is 
 * not settable, but equals the length of the partials array.
 * @example
 * osc.type = 'sine'
 * osc.partialCount = 3
 * //is equivalent to
 * osc.type = 'sine3'
 * @memberOf Tone.Oscillator#
 * @type {Number}
 * @name partialCount
 */
Object.defineProperty(Tone.Oscillator.prototype, "partialCount", {
	get : function(){
		return this._partialCount;
	},
	set : function(p){
		var type = this._type;
		var partial = /^(sine|triangle|square|sawtooth)(\d+)$/.exec(this._type);
		if (partial){
			type = partial[1];
		}
		if (this._type !== Tone.Oscillator.Type.Custom){
			if (p === 0){
				this.type = type;
			} else {
				this.type = type + p.toString();
			}
		}
	}
});

/**
 *  Get the object's attributes. Given no arguments get
 *  will return all available object properties and their corresponding
 *  values. 
 *  @memberOf Tone.Oscillator#
 *  @returns {Object}
 */
Tone.Oscillator.prototype.get = function(){
	var values = Tone.prototype.get.apply(this, arguments);
	if (values.type !== Tone.Oscillator.Type.Custom){
		delete values.partials;
	}
	return values;
};

/**
 *  Returns the real and imaginary components based
 *  on the oscillator type.
 *  @returns {Array} [real, imaginary]
 *  @private
 */
Tone.Oscillator.prototype._getRealImaginary = function(type, phase){
	var fftSize = 4096;
	var periodicWaveSize = fftSize / 2;

	var real = new Float32Array(periodicWaveSize);
	var imag = new Float32Array(periodicWaveSize);

	var partialCount = 1;
	if (type === Tone.Oscillator.Type.Custom){
		partialCount = this._partials.length + 1;
		this._partialCount = this._partials.length;
		periodicWaveSize = partialCount;
	} else {
		var partial = /^(sine|triangle|square|sawtooth)(\d+)$/.exec(type);
		if (partial){
			partialCount = parseInt(partial[2]) + 1;
			this._partialCount = parseInt(partial[2]);
			type = partial[1];
			partialCount = Math.max(partialCount, 2);
			periodicWaveSize = partialCount;
		} else {
			this._partialCount = 0;
		}
		this._partials = [];
	}

	for (var n = 1; n < periodicWaveSize; ++n){
		var piFactor = 2 / (n * Math.PI);
		var b;
		switch (type){
			case Tone.Oscillator.Type.Sine:
				b = (n <= partialCount) ? 1 : 0;
				this._partials[n-1] = b;
				break;
			case Tone.Oscillator.Type.Square:
				b = (n & 1) ? 2 * piFactor : 0;
				this._partials[n-1] = b;
				break;
			case Tone.Oscillator.Type.Sawtooth:
				b = piFactor * ((n & 1) ? 1 : -1);
				this._partials[n-1] = b;
				break;
			case Tone.Oscillator.Type.Triangle:
				if (n & 1){
					b = 2 * (piFactor * piFactor) * ((((n - 1) >> 1) & 1) ? -1 : 1);
				} else {
					b = 0;
				}
				this._partials[n-1] = b;
				break;
			case Tone.Oscillator.Type.Custom:
				b = this._partials[n - 1];
				break;
			default:
				throw new TypeError("Tone.Oscillator: invalid type: "+type);
		}
		if (b !== 0){
			real[n] = -b * Math.sin(phase * n);
			imag[n] = b * Math.cos(phase * n);
		} else {
			real[n] = 0;
			imag[n] = 0;
		}
	}
	return [real, imag];
};

/**
 *  Compute the inverse FFT for a given phase.
 *  @param  {Float32Array}  real
 *  @param  {Float32Array}  imag
 *  @param  {NormalRange}  phase
 *  @return  {AudioRange}
 *  @private
 */
Tone.Oscillator.prototype._inverseFFT = function(real, imag, phase){
	var sum = 0;
	var len = real.length;
	for (var i = 0; i < len; i++){
		sum += real[i] * Math.cos(i * phase) + imag[i] * Math.sin(i * phase);
	}
	return sum;
};

/**
 *  Returns the initial value of the oscillator.
 *  @return  {AudioRange}
 *  @private
 */
Tone.Oscillator.prototype._getInitialValue = function(){
	var coefs = this._getRealImaginary(this._type, 0);
	var real = coefs[0];
	var imag = coefs[1];
	var maxValue = 0;
	var twoPi = Math.PI * 2;
	//check for peaks in 8 places
	for (var i = 0; i < 8; i++){
		maxValue = Math.max(this._inverseFFT(real, imag, (i / 8) * twoPi), maxValue);
	}
	return -this._inverseFFT(real, imag, this._phase) / maxValue;
};

/**
 * The partials of the waveform. A partial represents
 * the amplitude at a harmonic. The first harmonic is the
 * fundamental frequency, the second is the octave and so on
 * following the harmonic series.
 * Setting this value will automatically set the type to "custom".
 * The value is an empty array when the type is not "custom".
 * @memberOf Tone.Oscillator#
 * @type {Array}
 * @name partials
 * @example
 * osc.partials = [1, 0.2, 0.01];
 */
Object.defineProperty(Tone.Oscillator.prototype, "partials", {
	get : function(){
		return this._partials;
	},
	set : function(partials){
		this._partials = partials;
		this.type = Tone.Oscillator.Type.Custom;
	}
});

/**
 * The phase of the oscillator in degrees.
 * @memberOf Tone.Oscillator#
 * @type {Degrees}
 * @name phase
 * @example
 * osc.phase = 180; //flips the phase of the oscillator
 */
Object.defineProperty(Tone.Oscillator.prototype, "phase", {
	get : function(){
		return this._phase * (180 / Math.PI);
	},
	set : function(phase){
		this._phase = phase * Math.PI / 180;
		//reset the type
		this.type = this._type;
	}
});

/**
 *  Dispose and disconnect.
 *  @return {Tone.Oscillator} this
 */
Tone.Oscillator.prototype.dispose = function(){
	Tone.Source.prototype.dispose.call(this);
	if (this._oscillator !== null){
		this._oscillator.dispose();
		this._oscillator = null;
	}
	this._wave = null;
	this._writable(["frequency", "detune"]);
	this.frequency.dispose();
	this.frequency = null;
	this.detune.dispose();
	this.detune = null;
	this._partials = null;
	return this;
};

export default Tone.Oscillator;

