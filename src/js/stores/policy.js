/*
 * Copyright (c) 2014 Adobe Systems Incorporated. All rights reserved.
 *  
 * Permission is hereby granted, free of charge, to any person obtaining a
 * copy of this software and associated documentation files (the "Software"), 
 * to deal in the Software without restriction, including without limitation 
 * the rights to use, copy, modify, merge, publish, distribute, sublicense, 
 * and/or sell copies of the Software, and to permit persons to whom the 
 * Software is furnished to do so, subject to the following conditions:
 *  
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *  
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, 
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER 
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING 
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER 
 * DEALINGS IN THE SOFTWARE.
 * 
 */

define(function (require, exports, module) {
    "use strict";

    var Fluxxor = require("fluxxor");
    
    var events = require("js/events"),
        EventPolicySet = require("js/models/eventpolicyset");

    var _eventKind = Object.defineProperties({}, {
        KEYBOARD: {
            value: "keyboard",
            writeable: false,
            enumerable: true
        },
        POINTER: {
            value: "pointer",
            writeable: false,
            enumerable: true
        }
    });

    /**
     * The PolicyStore tracks the set of active keyboard and pointer event
     * policies and provides an API for updating these policies.
     * 
     * @constructor
     */
    var PolicyStore = Fluxxor.createStore({
        /**
         * The set of policy sets, indexed by event kind
         * 
         * @private
         * @type {Object.<string, EventPolicySet>}
         */
        _policySets: null,

        /**
         * The current mode, indexed by event kind.
         *
         * @private
         * @param {Object.<string, number>}
         */
        _modes: null,

        /**
         * Policy sets saved by suspension, indexed by event kind.
         *
         * @private
         * @param {Object.<string, EventPolicySet>}
         */
        _suspendedPolicySets: null,

        /**
         * Modes saved by suspension, indexed by event kind.
         *
         * @private
         * @param {Object.<string, EventPolicySet>}
         */
        _suspendedModes: null,

        /**
         * Dirty bits for the policy sets, indexed by event kind.
         *
         * @private
         * @type {Object.<string, EventPolicySet>}
         */
        _dirtyPolicies: null,

        /**
         * Initialize the policy sets
         */
        initialize: function () {
            this.bindActions(
                events.RESET, this._handleReset,
                events.policies.POLICIES_INSTALLED, this._handlePoliciesInstalled,
                events.policies.MODE_CHANGED, this._handleModeChanged
            );

            this._handleReset();
        },

        /**
         * Emits a change event - used by debug policy overlay
         *
         * @private
         * @param {{kind: string}} payload
         */
        _handlePoliciesInstalled: function (payload) {
            delete this._dirtyPolicies[payload.kind];

            this.emit("change");
        },

        /**
         * Reset or initialize store state.
         *
         * @private
         */
        _handleReset: function () {
            var kinds = Object.keys(_eventKind);
            this._policySets = kinds.reduce(function (sets, kind) {
                sets[_eventKind[kind]] = new EventPolicySet();
                return sets;
            }.bind(this), {});

            this._modes = {};
            this._suspendedPolicySets = {};
            this._suspendedModes = {};
            this._dirtyPolicies = {};
        },

        /**
         * Set the current mode for the given event kind.
         *
         * @private
         * @param {{kind: string, mode: number}} payload
         */
        _handleModeChanged: function (payload) {
            var kind = payload.kind,
                mode = payload.mode;

            this._modes[kind] = mode;

            this.emit("change");
        },

        /**
         * Whether or not the policy needs to be synced to PS.
         *
         * @param {string} kind
         * @return {boolean}
         */
        isDirty: function (kind) {
            return !!this._dirtyPolicies[kind];
        },

        /**
         * Get the current mode for the given event kind.
         *
         * @param {string} kind
         * @return {number}
         */
        getMode: function (kind) {
            return this._modes[kind];
        },

        /**
         * Whether policies for the given event kind are currently suspended.
         *
         * @param {string} kind
         * @return {boolean}
         */
        isSuspended: function (kind) {
            return !!this._suspendedPolicySets[kind];
        },
        
        /**
         * Return true if all policies (mouse and keyboard) are suspended.
         * 
         * @return {boolean}
         */
        areAllSuspended: function () {
            return !!this._suspendedPolicySets[_eventKind.KEYBOARD] &&
                !!this._suspendedPolicySets[_eventKind.KEYBOARD];
        },

        /**
         * Suspend the policies and mode for the given event kind.
         *
         * @param {string} kind
         */
        suspend: function (kind) {
            var previousPolicySet = this._policySets[kind],
                counter = previousPolicySet.getNextPolicyID();

            this._policySets[kind] = new EventPolicySet(counter);
            this._suspendedPolicySets[kind] = previousPolicySet;
            this._suspendedModes[kind] = this._modes[kind];
            this._dirtyPolicies[kind] = true;

            this.emit("change");
        },

        /**
         * Restore the policies and mode for the given event kind.
         *
         * @param {string} kind
         */
        restore: function (kind) {
            var suspendedPolicies = this._suspendedPolicySets[kind],
                suspendedMode = this._suspendedModes[kind];

            if (!suspendedPolicies) {
                throw new Error("Policies are not currently suspended");
            }

            this._modes[kind] = suspendedMode;
            this._policySets[kind] = suspendedPolicies.append(this._policySets[kind]);
            delete this._suspendedPolicySets[kind];
            this._dirtyPolicies[kind] = true;

            this.emit("change");
        },

        /**
         * Remove an already installed event policy list
         *
         * @param {!string} kind A value defined in PolicyStore.eventKind
         * @param {!number} id         
         * @return {Array.<EventPolicy>}
         */
        removePolicyList: function (kind, id) {
            var suspendedPolicySet = this._suspendedPolicySets[kind];

            this._dirtyPolicies[kind] = true;

            if (suspendedPolicySet && suspendedPolicySet.has(id)) {
                return suspendedPolicySet.removePolicyList(id);
            } else {
                return this._policySets[kind].removePolicyList(id);
            }
        },

        /**
         * Remove an already installed keyboard event policy list
         *
         * @param {!number} id
         * @return {Array.<KeybaordEventPolicy>}
         */
        removeKeyboardPolicyList: function (id) {
            return this.removePolicyList(_eventKind.KEYBOARD, id);
        },

        /**
         * Remove an already installed pointer event policy list
         *
         * @param {!number} id
         * @return {Array.<PointerEventPolicy>}
         */
        removePointerPolicyList: function (id) {
            return this.removePolicyList(_eventKind.POINTER, id);
        },

        /**
         * Add a new event policy list
         *
         * @param {!string} kind A value defined in PolicyStore.eventKind
         * @param {!Array.<EventPolicy>} policyList
         * @return {number} ID of the newly installed policy list
         */
        addPolicyList: function (kind, policyList) {
            this._dirtyPolicies[kind] = true;

            return this._policySets[kind].addPolicyList(policyList);
        },

        /**
         * Add a new keyboard event policy list
         *
         * @param {!Array.<KeyboardEventPolicy>} policyList
         * @return {number} ID of the newly installed policy list
         */
        addKeyboardPolicyList: function (policyList) {
            return this.addPolicyList(_eventKind.KEYBOARD, policyList);
        },

        /**
         * Add a new pointer event policy list
         *
         * @param {!Array.<PointerEventPolicy>} policyList
         * @return {number} ID of the newly installed policy list
         */
        addPointerPolicyList: function (policyList) {
            return this.addPolicyList(_eventKind.POINTER, policyList);
        },

        /**
         * Get the master event policy list
         * 
         * @param {!string} kind A value defined in PolicyStore.eventKind
         * @return {Array.<object>}
         */
        getMasterPolicyList: function (kind) {
            return this._policySets[kind].getMasterPolicyList();
        },

        /**
         * Get the master keyboard event policy list
         * 
         * @return {Array.<object>}
         */
        getMasterKeyboardPolicyList: function () {
            return this.getMasterPolicyList(_eventKind.KEYBOARD);
        },

        /**
         * Get the master pointer event policy list
         * 
         * @return {Array.<object>}
         */
        getMasterPointerPolicyList: function () {
            return this.getMasterPolicyList(_eventKind.POINTER);
        }
    });

    /**
     * The kinds of policy sets.
     * 
     * @const
     * @type {Object.<string, string>}
     */
    PolicyStore.eventKind = _eventKind;

    module.exports = PolicyStore;
});
