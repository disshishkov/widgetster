module DS
{
    /**
     * A basic drag implementation for DOM elements inside a container.
     * 
     * @class Draggable
     */ 
    export class Draggable
    {
        private _defaultOptions: IDraggableOptions =
        {
            Items: ".ws-w",
            Distance: 4,
            IsLimit: true,
            OffsetLeft: 0,
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
        private _bodyElement: JQuery = $(document.body);
        private _documentElement: JQuery = $(document);
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
        
        private _scrollOffset: number = 0;
        private _playerMaxLeft: number;
        private _playerMinLeft: number;
        private _windowHeight: number;
        private _documentHeight: number;

        private _pointerEvents = new PointerEvents(
            this._isTouch ? "touchstart.widgetster-draggable" : "mousedown.widgetster-draggable",
            this._isTouch ? "touchmove.widgetster-draggable" : "mousemove.widgetster-draggable",
            this._isTouch ? "touchend.widgetster-draggable" : "mouseup.widgetster-draggable"
        );

        /**
         * Initialize the Draggable object.
         * 
         * @param {JQuery} [container] The JQuery object.
         * @param {IDraggableOptions} [options] An object of options (see IDraggableOptions).
         */ 
        constructor(container: JQuery, options: IDraggableOptions)
        {
            this._options = $.extend({}, this._defaultOptions, options);
            this._playerMinLeft = 0 + this._options.OffsetLeft;
            this._container = container;
            this.CalculatePositions();
            this._container.css("position", "relative");

            this._container.on(
                "selectstart.widgetster-draggable",
                $.proxy((event?) => { return (this._isDisabled || this.IsIgnoreDrag(event)); }, this));

            this._container.on(
                this._pointerEvents.Start,
                this._options.Items,
                $.proxy((event?) => { return this.DragHandler(event); }, this));

            this._bodyElement.on(
                this._pointerEvents.End,
                $.proxy((event?) =>
                {
                    this._isDragging = false;
                    if (this._isDisabled)
                    {
                        return true;
                    }
                    this._bodyElement.off(this._pointerEvents.Move);
                    if (this._isDragStart)
                    {
                        return this.OnDragStop(event);
                    }
                }, this));

            this._windowElement.bind(
                "resize.widgetster-draggable",
                Utils.Throttle($.proxy(this.CalculatePositions, this), 200));
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
            this._container.off(".widgetster-draggable");
            this._bodyElement.off(".widgetster-draggable");
            this._windowElement.off(".widgetster-draggable");
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

        private GetMousePosition(event: JQueryEventObject): JQueryCoordinates
        {
            var e = event;

            if (this._isTouch)
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

            var left: number = Math.round(this._initialOffset.left + diffX - this._basePosition.left);
            var top: number = Math.round(this._initialOffset.top + diffY - this._basePosition.top + this._scrollOffset);

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
            offset.Pointer = { Left: mousePosition.left, Top: mousePosition.top, DiffLeft: diffX, DiffTop: diffY + this._scrollOffset };
            
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
            var mouseZoneOffset: number = 50;
            var scrollOffset: number = 30;
            
            var nextScrollTop: number = null;
            var scrollTop: number = this._windowElement.scrollTop();
            
            var minWindowY: number = scrollTop;
            var maxWindowY: number = minWindowY + this._windowHeight;
            
            var mouseDownZone: number = maxWindowY - mouseZoneOffset;
            var mouseUpZone: number = minWindowY + mouseZoneOffset;
            var absMouseTop: number = minWindowY + data.Pointer.Top;
            
            if (absMouseTop >= mouseDownZone)
            {
                nextScrollTop = scrollTop + scrollOffset;
                if (nextScrollTop < (this._documentHeight - this._windowHeight + this._player.height()))
                {
                    this._windowElement.scrollTop(nextScrollTop);
                    this._scrollOffset += scrollOffset;
                }
            }
            
            if (absMouseTop <= mouseUpZone)
            {
                nextScrollTop = scrollTop - scrollOffset;
                if (nextScrollTop > 0)
                {
                    this._windowElement.scrollTop(nextScrollTop);
                    this._scrollOffset -= scrollOffset;
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
            
            this._scrollOffset = 0;
            this._basePosition = this._container.offset();
            this._initialOffset = this._player.offset();            
            
            if (this._options.IsUseHelper)
            {
                this._helper = this._player.clone().appendTo(this._container).addClass("ws-helper");
            }
            
            this._playerMaxLeft = ((this._options.ContainerWidth || this._container.width()) - this._player.width() + this._options.OffsetLeft);
            
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
            
            this._bodyElement.on(this._pointerEvents.Move, (e: JQueryEventObject) => 
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

            return $(event.target).is(this._options.IgnoreDragging.join(", "));
        }

        private CalculatePositions(): void
        {
            this._windowHeight = this._windowElement.height();
            this._documentHeight = this._documentElement.height();
        }
    }
}