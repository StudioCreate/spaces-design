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

    var Immutable = require("immutable");

    var LayerStructure = require("./layerstructure"),
        Bounds = require("./bounds");

    /**
     * Model for a Photoshop document
     * 
     * @constructor
     * @param {object} descriptor Photoshop's data on the document
     */
    var Document = Immutable.Record({
        /**
         * @type {number} Document ID
         */
        id: null,

        /**
         * @type {string} Document name
         */
        name: null,

        /**
         * @type {boolean} True if there is a background layer (affects layer indexing)
         */
        hasBackgroundLayer: null,

        /**
         * @type {LayerTree} The layers in a tree format
         */
        layers: null,

        /**
         * @type {Bounds} Document bounds
         */
        bounds: null,

        /**
         * @type {number} Document resolution
         */
        resolution: null,

        /**
         * @type {Bounds} Document color mode
         */
        mode: null
    });

    /**
     * Construct a new document model from a Photoshop document descriptor and
     * a list of layer descriptors.
     * 
     * @param {object} documentDescriptor
     * @param {Immutable.Iterator.<object>} layerDescriptors
     * @return {Document}
     */
    Document.fromDescriptors = function (documentDescriptor, layerDescriptors) {
        var model = {};

        model.id = documentDescriptor.documentID;
        model.hasBackgroundLayer = documentDescriptor.hasBackgroundLayer;
        model.name = documentDescriptor.title;
        model.resolution = documentDescriptor.resolution.value;
        model.mode = documentDescriptor.mode.value;
        model.bounds = Bounds.fromDocumentDescriptor(documentDescriptor);
        model.layers = LayerStructure.fromDescriptors(documentDescriptor, layerDescriptors);

        return new Document(model);
    };

    /**
     * Resize the bounds of this document model
     *
     * @param {number} x
     * @param {number} y
     * @return {Document}
     */
    Document.prototype.resize = function (x, y) {
        return this.set("bounds", this.bounds.updateSize(x, y));
    };

    module.exports = Document;
});
