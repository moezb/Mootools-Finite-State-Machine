var BaseClass = new Class({
	staticProperties : new Hash(),
	initialize : function() {
	}
});

var State = new Class({
	Implements : [ Options, Events, BaseClass ],
	options : {
		name : 'State',
		eventConsumePolicy : false,
		boundEvents : [],
		boundKeyboardEvents : [],
		isTerminal : false
	},
	isTerminal : false,
	active : false,
	machine : null,
	trigger : null,
	keyboard : null,
	transitions : [],
	boundEvents : [],
	boundKeyboardEvents : [],
	// event listner
	listner : null,
	actionlistner : null,
	setMachine : function(machine) {
		this.machine = machine;
		this.trigger = machine.trigger;
		this.keyboard = machine.keyboard;
		this.machine.addState(this);
	},

	initialize : function(options, machine) {

		if (options && options.states)
			machine = options;
		else {
			this.setOptions(options);
			if (this.options.boundEvents)
				this.boundEvents = Array.clone(this.options.boundEvents);
			if (this.options.boundKeyboardEvents)
				this.boundKeyboardEvents = Array
						.clone(this.options.boundKeyboardEvents);
			this.isTerminal = this.options.isTerminal;
		}
		this.setMachine(machine);
		this.listner = this.eventListner.bind(this);

	},
	unbindEvents : function() {
		for ( var i = 0; i < this.boundEvents.length; i++)
			$(this.trigger).removeEvent(this.boundEvents[i], this.listner);
		for ( var j = 0; j < this.boundKeyboardEvents.length; j++)
			if (this.keyboard)
				this.keyboard.removeEvent(this.boundKeyboardEvents[j],
						this.listner);
	},
	bindEvents : function() {
		for ( var i = 0; i < this.boundEvents.length; i++)
			$(this.trigger).addEvent(this.boundEvents[i], this.listner);
		for ( var j = 0; j < this.boundKeyboardEvents.length; j++)
			if (this.keyboard)
				this.keyboard.addEvent(this.boundKeyboardEvents[j],
						this.listner);
	},
	onEntry : function(evt) {
		return true;
	},
	enter : function(evt) {
		console.log("State : " + this.options.name + " entered.");
		var success;
		if (this.machine.currentState != this) {
			success = this.onEntry(evt);
			if (!success)
				return false;
		}
		if (this.machine.currentState != this) {
			this.active = true;
			this.bindEvents();
			for ( var j = 0; j < this.transitions.length; j++) {
				var tr = this.transitions[j];
				tr.activate(this);
			}
		}
		return true;
	},
	onExit : function(evt) {
		return true;
	},
	exit : function(evt) {
		if (!this.onExit(evt))
			return false;
		this.unbindEvents();
		console.log("State : " + this.options.name + " exited.");
		this.active = false;
		return true;
	},
	forceExit : function(evt) {
		this.unbindEvents();
		for ( var j = 0; j < this.transitions.length; j++) {
			var tr = this.transitions[j];
			this.unbindTransitionEvents(tr);
		}
		this.active = false;
	},
	addTransition : function(transition) {
		if (this.transitions.contains(transition))
			return;
		this.transitions.include(transition);
		if (this.active)
			transition.activate(this);

	},
	removeTransition : function(transition) {
		if (this.transitions.contains(transition)) {
			this.transitions.erase(transition);
			if (this.active)
				transition.deActivate();
		}
	},
	actionListner : function(evt) {
		return true;
	},
	eventListner : function(evt) {
		return this.actionListner(evt);
	}
});

var Transition = new Class({
	Implements : [ Options, Events, BaseClass ],
	options : {
		name : 'Transition'
	},
	events : [],
	keyboardEvents : [],
	sourceState : null,
	targetState : null,
	transitionListner : null,

	initialize : function(options) {
		this.setOptions(options);
		this.transitionListner = this.doTransition.bind(this);
	},
	activate : function(sourceState) {
		console.log('binding transition ' + this.options.name + 'events ');
		this.sourceState = sourceState;
		var sourceStateTrigger = this.sourceState.trigger;
		for ( var i = 0; i < this.events.length; i++) {
			if (sourceStateTrigger)
				$(sourceStateTrigger).addEvent(this.events[i],
						this.transitionListner);
		}
		for ( var j = 0; j < this.keyboardEvents.length; j++) {
			if (this.sourceState.keyboard)
				this.sourceState.keyboard.addEvent(this.keyboardEvents[j],
						this.transitionListner);
		}
	},
	deActivate : function() {
		console.log('unbinding transition ' + this.options.name + 'events ');
		for ( var i = 0; i < this.events.length; i++) {
			var evt = this.events[i];
			if (this.sourceState) {
				var sourceStateTrigger = this.sourceState.trigger;
				$(sourceStateTrigger).removeEvent(evt, this.transitionListner);
			}
		}

		for ( var j = 0; j < this.keyboardEvents.length; j++) {
			var evt = this.keyboardEvents[j];

			if (this.sourceState.keyboard)
				this.sourceState.keyboard.removeEvent(evt,
						this.transitionListner);

		}
		this.sourceState = null;
	},
	doTransition : function(evt) {
		this.onTransition(evt);
		var machine = this.targetState.machine;
		var accepted = this.onTransition(evt);
		if (!accepted)
			return false;
		this.deActivate();
		machine.setCurrentState(this.targetState, evt);
		return true;
	},
	onTransition : function(evt) {
		return true;
	}
});

var StateMachine = new Class(
		{
			Implements : [ Options, Events, BaseClass ],
			options : {
				name : 'State machine',
				trigger : null
			// for now it must be an string identifier of an element
			},
			machineState : 0,
			keyboard : null,
			states : [],
			currentState : null,
			initialState : null,
			initialize : function(options) {
				this.setOptions(options);
				this.staticProperties.set('RunState', {
					'NotRunning' : 0,
					'Starting' : 1,
					'Running' : 2
				});
				StateMachine.prototype.destructor = function() {
					console.log('Destructor!');
				};
				this.machineState = 0;
			},
			addState : function(state) {
				if (!this.states.contains(state))
					this.states.include(state);
				else
					this.onMsg('addState: state' + state.options.name
							+ ' is already one of the machine '
							+ this.options.name + 'states');
			},
			removeState : function(state) {
				if (!state)
					return this.onError("Can't remove a null state");
				if (state == this.currentState)
					return this.onError("Can't remove a current state");
				if (!this.states.contains(state))
					this.onMsg('removeState: state' + state.options.name
							+ ' is not one of the machine ' + this.options.name
							+ 'states');
				else
					this.states.erase(state);
			},
			start : function(state) {
				if (this.machineState != this.staticProperties.RunState.NotRunning) {
					this.onError('Machine: ' + this.options.name
							+ ' is already running.');
					return false;
				}
				if (this.keyboard)
					this.keyboard.activate();
				this.onMsg('Machine: ' + this.options.name + ' is starting');
				if (!this.states.contains(state)) {
					this
							.onError('the requested state '
									+ state.options.name
									+ ' is not added to the machine state set use addState().');
					return false;
				}

				this.machineState = this.staticProperties.RunState.Starting;
				if (!this.onStart()) {
					this.onError('Machine: ' + this.options.name
							+ ' couldnt be started correctly, stopping..');
					this.stop();
					return false;
				}
				var success = this.setCurrentState(state);
				if (success)
					this.initialState = state;
				else
					this.stop();
				return success;
			},
			onStart : function() {
				return true;
			},
			onStop : function() {
				return true;
			},
			setCurrentState : function(state, evt, forceLeave) {
				if (this.machineState == this.staticProperties.RunState.NotRunning)
					return this
							.onError("you can't set a a current state while machine is stoppped. Start it first.");
				if (!state)
					return this.onError('null state!');
				if (!this.states.contains(state))
					return this
							.onError('the requested state '
									+ state.options.name
									+ ' is not added to the machine state set use addState().');

				if (this.currentState) {
					if (state != this.currentState)
						var canExit = this.currentState.exit(evt);
					if (!canExit) {
						if (forceLeave) {
							this.currentState.forceExit();
							this.currentState = null;
						} else
							return this
									.onError('the current state '
											+ this.currentState.options.name
											+ ' could not be terminated properly. use force transition.');

					}
				}
				var canEnter = state.enter(evt);

				if (!canEnter && !this.currentState) {
					this.stop(false);// stop the machine
					return this
							.onError("Could not do this transition and machine have no current state : Blocked mode , machine will be stopped.");
				}
				if (canEnter) {
					this.currentState = state;
					this.onMsg('Machine :' + this.options.name
							+ ' current state is : ' + state.options.name);
					this.machineState = this.staticProperties.RunState.Running;
					if (this.currentState.isTerminal) {
						this.stop(false);
						this.onMsg('The current state '
								+ this.currentState.options.name
								+ " is terminal state. Stopping the machine.");
					}
				}
				return canEnter;
			},
			stop : function(keyboarActiveState) {
				this.onStop();
				if (this.keyboard)
					if (keyboarActiveState)
						this.keyboard.deactivate();
				if (this.machineState == this.staticProperties.RunState.NotRunning)
					this.onMsg('Machine :' + this.options.name
							+ ' is not running.');
				if (this.currentState && this.currentState.options.active) {
					if (this.currentState.exit())
						this.currentState.forceExit();
				} else
					this.onMsg('Machine: ' + this.options.name
							+ ' has no current state.');

				this.onMsg('Machine: ' + this.options.name + ' is stopped.');
				this.machineState = this.staticProperties.RunState.NotRunning;
			},
			onError : function(msg) {
				console.log(msg);
				return false;
			},
			onMsg : function(msg) {
				console.log(msg);
			}
		});

function say(who, msg, elem) {
	var text = elem.textContent;
	text += '\n' + '[' + who + ']' + ':' + msg;
	elem.textContent = text;
}
