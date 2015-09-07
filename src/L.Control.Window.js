L.Control.Window = L.Control.extend({

    includes: L.Mixin.Events,

    options: {
        className: 'control-window',
        visible: false,
        title: undefined,
        closeButton: true,
        content: undefined,
        prompt: undefined,
        maxWidth: 600,
        modal: false
    },

    initialize: function (map, options) {
        var self = this;
        this.map = map;
        L.setOptions(this, options);

        if (!map.hasOwnProperty('controlWindow')){
            map.controlWindow = [this]
        } else {
            map.controlWindow.push(this)
        }

        var modality = 'nonmodal'

        if (this.options.modal){
            modality = 'modal'
        }

        // Create popup window container
        this._wrapper = L.DomUtil.create('div',modality);


        this._container = L.DomUtil.create('div', 'leaflet-control leaflet-control-window '+this.options.className,this._wrapper);
        this._container.setAttribute('style','max-width:'+this.options.maxWidth+'px');

        this._containerTitleBar = L.DomUtil.create('div', 'titlebar',this._container);
        this.titleContent = L.DomUtil.create('h2', 'title',this._containerTitleBar);
        this._containerContent =  L.DomUtil.create('div', 'content' ,this._container);
        this._containerPromptButtons =  L.DomUtil.create('div', 'promptButtons' ,this._container);

        if (this.options.closeButton) {
            this._closeButton = L.DomUtil.create('a', 'close',this._containerTitleBar);
            this._closeButton.innerHTML = '&times;';
        }

        var controlContainer = map._controlContainer;
        controlContainer.insertBefore(this._wrapper, controlContainer.lastChild);


        // Make sure we don't drag the map when we interact with the content
        var stop = L.DomEvent.stopPropagation;
        L.DomEvent
            .on(this._wrapper, 'contextmenu', stop)
            .on(this._wrapper, 'click', stop)
            .on(this._wrapper, 'mousedown', stop)
            .on(this._wrapper, 'touchstart', stop)
            .on(this._wrapper, 'dblclick', stop)
            .on(this._wrapper, 'mousewheel', stop)
            .on(this._wrapper, 'MozMousePixelScroll', stop)

        // Attach event to close button
        if (this.options.closeButton) {
            var close = this._closeButton;
            L.DomEvent.on(close, 'click', this.hide, this);
        }

        if (this.options.title){
            this.title(this.options.title)
        }

        if (this.options.content) {
            this.content(this.options.content)
        }

        if (typeof(this.options.prompt)=='object') {
            this.prompt(this.options.prompt)
        }

        if (this.options.visible){
            this.show()
        }

        map.on('resize',function(){self.mapResized()});
    },
    title: function(titleContent){
        if (titleContent==undefined){
            return this.options.title
        }

        this.options.title = titleContent;
        var title = titleContent || '';
        this.titleContent.innerHTML = title;
        return this;
    },
    remove: function (map) {

        // Remove sidebar container from controls container
        var controlContainer = map._controlContainer;
        controlContainer.removeChild(this._wrapper);

        //disassociate the map object
        this._map = null;

        // Unregister events to prevent memory leak
        var stop = L.DomEvent.stopPropagation;
        L.DomEvent
            .off(this._wrapper, 'contextmenu', stop)
            .off(this._wrapper, 'click', stop)
            .off(this._wrapper, 'mousedown', stop)
            .off(this._wrapper, 'touchstart', stop)
            .off(this._wrapper, 'dblclick', stop)
            .off(this._wrapper, 'mousewheel', stop)
            .off(this._wrapper, 'MozMousePixelScroll', stop);

        map.off('resize',self.mapResized);

        if (this._closeButton && this._close) {
            var close = this._closeButton;
            L.DomEvent.off(close, 'click', this.hide, this);
        }
        return this;
    },

    mapResized : function(){
      // this.show()
    },
    show: function (position) {

        L.DomUtil.addClass(this._container, 'visible');

        var width = window.innerWidth
            || document.documentElement.clientWidth
            || document.body.clientWidth;

        var height = window.innerHeight
            || document.documentElement.clientHeight
            || document.body.clientHeight;

        this.setContentMaxHeight();
        var thisWidth = this._container.offsetWidth;
        var thisHeight = this._container.offsetHeight;
        var margin = 8;

        var offset =0; // (map.controlWindow.length-1)*10;

        if (position == 'topLeft'){
            this.showOnCoordinates([0,offset])
        } else if (position == 'left') {
            this.showOnCoordinates([0, height/2-thisHeight/2-margin+offset])
        } else if (position == 'bottomLeft') {
            this.showOnCoordinates([0, height-thisHeight-margin*2-offset])
        } else if (position == 'top') {
            this.showOnCoordinates([width/2-thisWidth/2-margin,offset])
        } else if (position == 'topRight') {
            this.showOnCoordinates([width-thisWidth-margin*2, offset])
        } else if (position == 'right') {
            this.showOnCoordinates([width-thisWidth-margin*2, height/2-thisHeight/2-margin+offset])
        } else if (position == 'bottomRight') {
            this.showOnCoordinates([width-thisWidth-margin*2, height-thisHeight-margin*2-offset])
        } else if (position == 'bottom') {
            this.showOnCoordinates([width/2-thisWidth/2-margin, height-thisHeight-margin*2-offset])
        } else {
            this.showOnCoordinates([width/2-thisWidth/2-margin, height/2-thisHeight/2-margin+offset])
        }

        return this;
    },
    showOnCoordinates: function(point){

        this.setContentMaxHeight();
        L.DomUtil.setPosition(this._container, L.point(point[0],point[1]));

        var draggable = new L.Draggable(this._container,this._containerTitleBar);
        draggable.enable();

        L.DomUtil.addClass(this._container, 'visible');
        this.fire('show');
        return this;
    },
    hide: function (e) {
        var index = map.controlWindow.indexOf(this);
        if (index > -1) {
            map.controlWindow.splice(index, 1);
        }
        L.DomUtil.removeClass(this._container, 'visible');
        this.remove(this.map);
        this.fire('hide');
        return this;
    },

    getContainer: function () {
        return this._containerContent;
    },

    content: function (content) {
        if (content==undefined){
            return this.options.content
        }
        this.options.content = content;
        this.getContainer().innerHTML = content;
        return this;
    },

    prompt : function(promptObject){

        if (promptObject==undefined){
            return this.options.prompt
        }

        this.options.prompt = promptObject;

        this.setPromptCallback(promptObject.callback);

        var cancel = this.options.prompt.titleCancel || 'CANCEL';
        var ok = this.options.prompt.titleOK || 'OK';

        var btnOK= L.DomUtil.create('button','',this._containerPromptButtons);
        L.DomEvent.on(btnOK, 'click',this.promptCallback, this);
        btnOK.innerHTML=ok;

        var btnCancel= L.DomUtil.create('button','',this._containerPromptButtons);
        L.DomEvent.on(btnCancel, 'click', this.hide, this);
        btnCancel.innerHTML=cancel

        return this;
    },

    setPromptCallback : function(callback){
        var self = this;
        if (typeof(callback)!= 'function') { callback = function() {console.warn('No callback function specified!');}}
        var cb = function() { self.hide();callback();}
        this.promptCallback = cb;
    },

    setContentMaxHeight : function(){
        var margin = 68;

        if (this.options.title){
            margin += this._containerTitleBar.offsetHeight-36;
        }
        if (typeof(this.options.prompt) == 'object'){
            margin += this._containerPromptButtons.offsetHeight-20
        }

        var height = window.innerHeight
            || document.documentElement.clientHeight
            || document.body.clientHeight;

        var maxHeight = height - margin;
        this._containerContent.setAttribute('style','max-height:'+maxHeight+'px')
    }
});

L.control.window = function (map,options) {
    return new L.Control.Window(map,options);
};