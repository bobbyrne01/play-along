import Tone from "../core/Tone";
import "../component/ScaledEnvelope";
import "../component/Envelope";

/**
 *  @class Tone.FrequencyEnvelope is a Tone.ScaledEnvelope, but instead of `min` and `max`
 *         it's got a `baseFrequency` and `octaves` parameter.
 *
 *  @extends {Tone.Envelope}
 *  @constructor
 *  @param {Time|Object} [attack]	the attack time in seconds
 *  @param {Time} [decay]	the decay time in seconds
 *  @param {number} [sustain] 	a percentage (0-1) of the full amplitude
 *  @param {Time} [release]	the release time in seconds
 *  @example
 *  var freqEnv = new Tone.FrequencyEnvelope({
 *  	"attack" : 0.2,
 *  	"baseFrequency" : "C2",
 *  	"octaves" : 4
 *  });
 *  freqEnv.connect(oscillator.frequency);
 */
Tone.FrequencyEnvelope = function(){

	var options = Tone.defaults(arguments, ["attack", "decay", "sustain", "release"], Tone.Envelope);
	//merge it with the frequency envelope defaults
	options = Tone.defaultArg(options, Tone.FrequencyEnvelope.defaults);
	Tone.ScaledEnvelope.call(this, options);

	/**
	 *  Stores the octave value
	 *  @type {Positive}
	 *  @private
	 */
	this._octaves = options.octaves;

	//setup
	this.baseFrequency = options.baseFrequency;
	this.octaves = options.octaves;
	this.exponent = options.exponent;
};

Tone.extend(Tone.FrequencyEnvelope, Tone.Envelope);

/**
 *  the default parameters
 *  @static
 */
Tone.FrequencyEnvelope.defaults = {
	"baseFrequency" : 200,
	"octaves" : 4,
	"exponent" : 1
};

/**
 * The envelope's mininum output value. This is the value which it
 * starts at.
 * @memberOf Tone.FrequencyEnvelope#
 * @type {Frequency}
 * @name baseFrequency
 */
Object.defineProperty(Tone.FrequencyEnvelope.prototype, "baseFrequency", {
	get : function(){
		return this._scale.min;
	},
	set : function(min){
		this._scale.min = this.toFrequency(min);
		//also update the octaves
		this.octaves = this._octaves;
	}
});

/**
 * The number of octaves above the baseFrequency that the
 * envelope will scale to.
 * @memberOf Tone.FrequencyEnvelope#
 * @type {Positive}
 * @name octaves
 */
Object.defineProperty(Tone.FrequencyEnvelope.prototype, "octaves", {
	get : function(){
		return this._octaves;
	},
	set : function(octaves){
		this._octaves = octaves;
		this._scale.max = this.baseFrequency * Math.pow(2, octaves);
	}
});

/**
 * The envelope's exponent value.
 * @memberOf Tone.FrequencyEnvelope#
 * @type {number}
 * @name exponent
 */
Object.defineProperty(Tone.FrequencyEnvelope.prototype, "exponent", {
	get : function(){
		return this._exp.value;
	},
	set : function(exp){
		this._exp.value = exp;
	}
});

/**
 *  clean up
 *  @returns {Tone.FrequencyEnvelope} this
 */
Tone.FrequencyEnvelope.prototype.dispose = function(){
	Tone.ScaledEnvelope.prototype.dispose.call(this);
	return this;
};

export default Tone.FrequencyEnvelope;

