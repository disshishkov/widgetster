module DS
{
    /**
     * A basic drag implementation for DOM elements inside a container.
     * 
     * @class Draggable
     */ 
    export class Draggable
    {
        public static DefaultOptions: IDraggableOptions =
        {
            Items: ".ws-w",
            Distance: 4,
            IsLimit: true,
            IsResize: false,
            OffsetLeft: 0,
            OffsetTop: 0,
            IsAutoScroll: true,
            IgnoreDragging: ["INPUT", "TEXTAREA", "SELECT", "BUTTON"],
            Handle: null,
            ContainerWidth: 0,
            IsMoveElement: true,
            IsUseHelper: false,
            OnDrag: null,
            OnStart: null,
            OnStop: null
        };
        
        private _options: IDraggableOptions;

        private _windowElement: JQuery = $(window);
        private _dicumentElement: JQuery = $(document);
        private _player: JQuery;
        private _helper: JQuery;
        private _container: JQuery;

        private _initialMousePosition: JQueryCoordinates;        
        private _basePosition: JQueryCoordinates;
        private _lastPosition: JQueryCoordinates;
        private _initialOffset: JQueryCoordinates;        

        private _isTouch: boolean = !!("ontouchstart" in window);
        private _isDragging: boolean = false;
        private _isDragStart: boolean = false;
        private _isDisabled: boolean = false;
        
        private _winOffsetX: number = 0;
        private _winOffsetY: number = 0;
        private _playerMaxLeft: number;
        private _playerMinLeft: number;
        private _windowHeight: number;
        private _windowWidth: number;
        
        private _idCounter: number = 0;
        private _namespace: string = "";

        private _pointerEvents: PointerEvents = null;

        /**
         * Initialize the Draggable object.
         * 
         * @param {JQuery} [container] The JQuery object.
         * @param {IDraggableOptions} [options] An object of options (see IDraggableOptions).
         */ 
        constructor(container: JQuery, options: IDraggableOptions)
        {
            this._options = $.extend({}, Draggable.DefaultOptions, options);
            this._namespace = ".widgetster-draggable" + this.GetUniqueId();
            
            this._pointerEvents = new PointerEvents(
                this.NamespacedEvent("touchstart") + " " + this.NamespacedEvent("mousedown"),
                this.NamespacedEvent("touchmove") + " " + this.NamespacedEvent("mousemove"),
                this.NamespacedEvent("touchend") + " " + this.NamespacedEvent("mouseup")
            );
            
            this._playerMinLeft = 0 + this._options.OffsetLeft;
            this._container = container;
            this.CalculateDimensions();
            var pos: string = this._container.css("position");
            this._container.css("position", (pos === "static" ? "relative" : pos));

            this._container.on(
                "selectstart.widgetster-draggable",
                $.proxy((event?) => { return (this._isDisabled || this.IsIgnoreDrag(event)); }, this));

            this._container.on(
                this._pointerEvents.Start,
                this._options.Items,
                $.proxy((event?) => { return this.DragHandler(event); }, this));

            this._dicumentElement.on(
                this._pointerEvents.End,
                $.proxy((event?) =>
                {
                    this._isDragging = false;
                    if (this._isDisabled)
                    {
                        return true;
                    }
                    this._dicumentElement.off(this._pointerEvents.Move);
                    if (this._isDragStart)
                    {
                        return this.OnDragStop(event);
                    }
                }, this));

            this._windowElement.bind(
                this.NamespacedEvent("resize"),
                Utils.Throttle($.proxy(this.CalculateDimensions, this), 200));
        }
        
        /**
         * Update options.
         * 
         * @param {IDraggableOptions} [options] The IDraggableOptions object.
         * 
         * @method UpdateOptions.
         */ 
        public UpdateOptions(options: IDraggableOptions): void
        {
            this._options = $.extend({}, this._options, options);
        }

        /**
         * Destrois the instance.
         * 
         * @method Destroy.
         */ 
        public Destroy(): void
        {
            this.Disable();
            this._container.off(this._namespace);
            this._dicumentElement.off(this._namespace);
            this._windowElement.off(this._namespace);
        }

        /**
         * Disables the instance.
         * 
         * @method Disable.
         */ 
        public Disable(): void
        {
            this._isDisabled = true;
        }

        /**
         * Enables the instance.
         * 
         * @method Enable.
         */ 
        public Enable(): void
        {
            this._isDisabled = false;
        }
        
        /**
         * Sets draggable limits.
         * 
         * @param {number} [containterWidth] The width of container.
         * 
         * @method SetLimits.
         */
        public SetLimits(containterWidth: number): void
        {
            var playerWidth = (this._player != null) ? this._player.width() : 0;
            containterWidth || (containterWidth = this._container.width());
            this._playerMaxLeft = (containterWidth - playerWidth + this._options.OffsetLeft);
            
            this._options.ContainerWidth = containterWidth;
        }

        private GetMousePosition(event: JQueryEventObject): JQueryCoordinates
        {
            var e = event;

            if (e.originalEvent && e.originalEvent.touches)
            {
                var oe = e.originalEvent;
                e = oe.touches.length ? oe.touches[0] : oe.changedTouches[0];
            }

            return {
                left: e.clientX,
                top: e.clientY
            };
        }

        private GetOffset(event: JQueryEventObject): DraggableData
        {
            event.preventDefault();
            var mousePosition: JQueryCoordinates = this.GetMousePosition(event);

            var diffX: number = Math.round(mousePosition.left - this._initialMousePosition.left);
            var diffY: number = Math.round(mousePosition.top - this._initialMousePosition.top);

            var left: number = Math.round(this._initialOffset.left + diffX 
                - this._basePosition.left + this._windowElement.scrollLeft() - this._winOffsetX);
            var top: number = Math.round(this._initialOffset.top + diffY 
                - this._basePosition.top + this._windowElement.scrollTop() - this._winOffsetY);

            if (this._options.IsLimit)
            {
                if (left > this._playerMaxLeft)
                {
                    left = this._playerMaxLeft;
                }
                else if (left < this._playerMinLeft)
                {
                    left = this._playerMinLeft;
                }
            }
            
            var offset: DraggableData = new DraggableData();
            offset.Position = { left: left, top: top };
            offset.Pointer = { 
                Left: mousePosition.left, 
                Top: mousePosition.top, 
                DiffLeft: diffX + this._windowElement.scrollLeft() - this._winOffsetX, 
                DiffTop: diffY + this._windowElement.scrollTop() - this._winOffsetY 
            };
            
            return offset;
        }
        
        private GetDragData(event: JQueryEventObject): DraggableData
        {
            var offset = this.GetOffset(event);
            offset.Player = this._player;
            offset.Helper = this._options.IsUseHelper ? this._helper : this._player;
            
            return offset;
        }
        
        private ManageScroll(data: DraggableData): void
        {
            this.ScrollIn(true, data);
            this.ScrollIn(false, data);
        }
        
        private ScrollIn(isX: boolean, data: DraggableData): void
        {
            var mouseZoneOffset: number = 50;
            var scrollOffset: number = 30;
            var nextScroll: number = null;
            
            var windowSize: number = isX ? this._windowWidth : this._windowHeight;
            var documentSize: number = isX ? $(document).width() : $(document).height();
            var playerSize: number = isX ? this._player.width() : this._player.height();
            var scroll: number = isX ? this._windowElement.scrollLeft() : this._windowElement.scrollTop();
            var pointerPos: number = isX ? data.Pointer.Left : data.Pointer.Top;
            
            var minWindowPos: number = scroll;
            var maxWindowPos: number = minWindowPos + windowSize;
            
            var mouseDownZone: number = maxWindowPos - mouseZoneOffset;
            var mouseUpZone: number = minWindowPos + mouseZoneOffset;
            var absMousePos: number = minWindowPos + pointerPos;
            
            if (absMousePos >= mouseDownZone)
            {
                nextScroll = scroll + scrollOffset;
                if (nextScroll < (documentSize - windowSize + playerSize))
                {
                    if (isX)
                    {
                        this._windowElement.scrollLeft(nextScroll);
                    }
                    else
                    {
                        this._windowElement.scrollTop(nextScroll);
                    }                    
                }
            }
            
            if (absMousePos <= mouseUpZone)
            {
                nextScroll = scroll - scrollOffset;
                if (nextScroll > 0)
                {
                    if (isX)
                    {
                        this._windowElement.scrollLeft(nextScroll);
                    }
                    else
                    {
                        this._windowElement.scrollTop(nextScroll);
                    }
                }
            }
        }

        private OnDragStop(event: JQueryEventObject): boolean
        {
            this._isDragStart = false;

            if (this._options.OnStop)
            {
                this._options.OnStop.call(this._player, event, this.GetDragData(event));
            }
            
            if (this._options.IsUseHelper)
            {
                this._helper.remove();
            }            

            return false;
        }
        
        private OnDragStart(event: JQueryEventObject): void
        {
            event.preventDefault();
            
            if (this._isDragging)
            {
                return;
            }
            
            this._isDragging = true;
            this._isDragStart = true;
            
            this._winOffsetX = this._windowElement.scrollLeft();
            this._winOffsetY = this._windowElement.scrollTop();
            this._basePosition = this._container.offset();
            this._initialOffset = this._player.offset();            
            
            if (this._options.IsUseHelper)
            {
                this._helper = this._player.clone().appendTo(this._container).addClass("ws-helper");
            }
            
            this.SetLimits(this._options.ContainerWidth);
            
            if (this._options.OnStart)
            {
                this._options.OnStart.call(this._player, event, this.GetDragData(event));
            }
        }
        
        private OnDragMove(event: JQueryEventObject): void
        {
            var data: DraggableData = this.GetDragData(event);
            if (this._options.IsAutoScroll)
            {
                this.ManageScroll(data);
            }
            
            if (this._options.IsMoveElement)
            {
                (this._options.IsUseHelper ? this._helper : this._player).css(
                {
                    "position": "absolute",
                    "left": data.Position.left,
                    "top": data.Position.top
                });
            }
            
            if (this._options.OnDrag)
            {
                var lastPosition: JQueryCoordinates = this._lastPosition || data.Position;
                data.PrevPosition = lastPosition;                        
                this._options.OnDrag.call(this._player, event, data);
                this._lastPosition = data.Position;
            }
        }

        private DragHandler(event: JQueryEventObject): boolean
        {
            if (this._isDisabled || (event.which != 1 && !this._isTouch) || this.IsIgnoreDrag(event))
            {
                return true;
            }

            var isFirst: boolean = true;
            this._player = $(event.currentTarget);
            this._initialMousePosition = this.GetMousePosition(event);
            
            this._dicumentElement.on(this._pointerEvents.Move, (e: JQueryEventObject) => 
            {
                var mousePosition: JQueryCoordinates = this.GetMousePosition(e);
                
                if (!(Math.abs(mousePosition.left - this._initialMousePosition.left) > this._options.Distance
                    || Math.abs(mousePosition.top - this._initialMousePosition.top) > this._options.Distance))
                {
                    return false;
                }
                
                if (isFirst)
                {
                    isFirst = false;
                    this.OnDragStart(e);
                    
                    return false;
                }
                
                if (this._isDragging)
                {
                    this.OnDragMove(e);
                }
                
                return false;
            });
            
            return this._isTouch;
        }

        private IsIgnoreDrag(event: JQueryEventObject): boolean
        {
            if (this._options.Handle != null)
            {
                return !$(event.target).is(this._options.Handle);
            }
            
            if ($.isFunction(this._options.IgnoreDragging))
            {
                return this._options.IgnoreDragging(event);
            }

            return $(event.target).is(this._options.IgnoreDragging.join(", "));
        }

        private CalculateDimensions(): void
        {
            this._windowHeight = this._windowElement.height();
            this._windowWidth = this._windowElement.width();
        }
        
        private GetUniqueId(): string
        {
            return (++this._idCounter).toString();
        }
        
        private NamespacedEvent(event: string): string
        {
            return (event || "") + this._namespace;
        }
    }
}