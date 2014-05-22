/// <reference path="IWidgetsterOptions.ts" />
/// <reference path="ICoordsData.ts" />
/// <reference path="ICollisionOptions.ts" />
/// <reference path="IDraggableOptions.ts" />
/// <reference path="ITouchEvents.ts" />
/// <reference path="IPointerData.ts" />
/// <reference path="IResizeOptions.ts" />
/// <reference path="IWidget.ts" />
/// <reference path="DraggableData.ts" />
/// <reference path="Coords.ts" />
/// <reference path="Utils.ts" />
/// <reference path="Collision.ts" />
/// <reference path="PointerEvents.ts" />
/// <reference path="Draggable.ts" />

module DS
{
    /**
     * The Widgetster JQuery plugin.
     * 
     * @class Widgetster
     */ 
    export class Widgetster
    {
        private _defaultOptions: IWidgetsterOptions =
        {
            Namespace: "",
            Selector: "li",
            Margins: [10, 10],
            BaseDimensions: [400, 225],
            ExtraRows: 0,
            ExtraCols: 0,
            MinCols: 1,
            MaxCols: null,
            MinRows: 15,
            MaxSizeX: null,
            IsAvoidOverlap: true,
            SerializeParams: (widgetElement: JQuery, widget: IWidget) => { return widget; },
            Collision: <ICollisionOptions>{},
            Draggable: <IDraggableOptions>{},
            Resize: 
            {
                IsEnabled: false,
                Axes: ["x", "y", "both"],
                HandleAppendTo: "",
                HandleClass: "ws-resize-handle",
                MaxSize: [Infinity, Infinity]
            }
        };

        private _options: IWidgetsterOptions;
        private _el: JQuery;
        private _windowElement: JQuery = $(window);
        private _wrapper: JQuery;
        private _widgetElements: JQuery;
        private _changedWidgetElements: JQuery;
        
        private _minWidgetWidth: number;
        private _minWidgetHeight: number;
        private _containerWidth: number;
        private _colsCount: number;
        private _rowsCount: number;
        private _basePosition: JQueryCoordinates = <JQueryCoordinates>{};
        private _resizeHandleTemplate: string;
        
        private _resizeApi: Draggable;
        private _dragApi: Draggable;
        
        private _fauxGrid: Coords[];
        private _gridMap: any[]; //TODO: detect type

        /**
         * Initialize the Widgetster object.
         * 
         * @param {JQuery} [container] The JQuery object that contains all widgets.
         * @param {IWidgetsterOptions} [options] An object of options (see IWidgetsterOptions).
         */ 
        constructor(el: JQuery, options: IWidgetsterOptions)
        {
            this._options = $.extend(true, {}, this._defaultOptions, options);
            
            this._el = el;
            this._wrapper = this._el.parent();
            this._widgetElements = this._el.children(this._options.Selector).addClass("ws-w");
            this._changedWidgetElements = $([]);
            
            this._minWidgetWidth = (2 * this._options.Margins[0]) + this._options.BaseDimensions[0];
            this._minWidgetHeight = (2 * this._options.Margins[1]) + this._options.BaseDimensions[1];
                        
            if (this._options.Resize.IsEnabled)
            {
                this._resizeHandleTemplate = $.map(this._options.Resize.Axes, (type) =>
                {
                    return '<span class="' + this._options.Resize.HandleClass 
                        + ' ' + this._options.Resize.HandleClass + '-' + type + '" />';
                }).join("");
            }
            
            this.GenerateGrid();            
            this.GetWidgetsFromDom();
            //TODO: set_dom_grid_height();
            this._wrapper.addClass("ready");
            //TODO: draggable();
            
            if (this._options.Resize.IsEnabled)
            {
                this._resizeApi = new Draggable(this._el, <IDraggableOptions>
                {
                    Items: "." + this._options.Resize.HandleClass,
                    Distance: 1,
                    OffsetLeft: this._options.Margins[0],
                    ContainerWidth: this._containerWidth,
                    IsMoveElement: false,
                    OnDrag: Utils.Throttle($.proxy(this.OnResize, this), 60),
                    OnStop: $.proxy((event?, data?) =>
                        {
                            Utils.Delay($.proxy(() => { this.OnStopResize(event, data); }, this), 120);
                        }, this)
                });
            }
            
            this._windowElement.bind("resize.widgetster", Utils.Throttle($.proxy(this.ReCalculateFauxGrid, this), 200));
            
            return this;            
        }
        
        private ReCalculateFauxGrid(): void
        {
            this._basePosition.left = (this._windowElement.width() - this._wrapper.width()) / 2;
            this._basePosition.top = this._wrapper.offset().top;

            this._fauxGrid.forEach($.proxy((coords?: Coords) => 
            {
                coords.Update(<ICoordsData>
                {
                    Top: this._basePosition.top + (coords.Data.Row - 1) * this._minWidgetHeight,
                    Left: this._basePosition.left + (coords.Data.Column - 1) * this._minWidgetWidth,
                    Width: coords.Width,
                    Height: coords.Height
                });
            }, this));
        }
        
        private GenerateGrid(): void
        {
            var wrapperWidth: number = this._wrapper.width();
            
            var maxCols: number = this._options.MaxCols;
            var minCols: number = Math.max.apply(Math, this._widgetElements.map((i, w) => { return $(w).attr("data-ws-col"); }));
            
            // get all rows that could be occupied by the current widgets
            var maxRows: number = this._options.ExtraRows;
            this._widgetElements.each((i, w) => { maxRows += (+$(w).attr("data-ws-sizey")); });
            
            this._colsCount = Math.max(minCols, (Math.floor(wrapperWidth / this._minWidgetWidth) + this._options.ExtraCols), this._options.MinCols);
            if (maxCols && maxCols >= minCols && maxCols < this._colsCount)
            {
                this._colsCount = maxCols;
            }
            
            this._rowsCount = Math.max(maxRows, this._options.MinRows);
            
            this._basePosition.left = (this._windowElement.width() - wrapperWidth) / 2;
            this._basePosition.top = this._wrapper.offset().top;
            
            // left and right gutters not included
            this._containerWidth = (this._colsCount * this._options.BaseDimensions[0]) + ((this._colsCount - 1) * 2 * this._options.Margins[0]);
            
            if (this._resizeApi)
            {
                this._resizeApi.UpdateOptions(<IDraggableOptions>{ ContainerWidth: this._containerWidth });
            }
            
            if (this._dragApi)
            {
                this._dragApi.UpdateOptions(<IDraggableOptions>{ ContainerWidth: this._containerWidth });
            }
            
            this._fauxGrid = [];
            this._gridMap = [];
            
            for(var col = this._colsCount; col > 0; col--)
            {
                this._gridMap[col] = [];
                for(var row = this._rowsCount; row > 0; row--)
                {
                    this.AddFauxCell(row, col);
                }
            }
        }
        
        private AddFauxCell(row: number, col: number): void
        {
            if (!$.isArray(this._gridMap[col]))
            {
                this._gridMap[col] = [];
            }
            this._gridMap[col][row] = false;
            this._fauxGrid.push(new Coords($(
                {
                    Top: this._basePosition.top + ((row - 1) * this._minWidgetHeight),
                    Left: this._basePosition.left + ((col - 1) * this._minWidgetWidth),
                    Width: this._minWidgetWidth,
                    Height: this._minWidgetHeight,
                    Row: row,
                    Column: col
                })));
        }
        
        private GetWidgetsFromDom(): void
        {
            this._widgetElements.each($.proxy((i?, w?) => { this.RegisterWidget($(w)); }, this));
        }
        
        private RegisterWidget(el: JQuery): void
        {
            var widget: IWidget = 
                {
                    Column: parseInt(el.attr("data-ws-col"), 10),
                    Row: parseInt(el.attr("data-ws-row"), 10),
                    SizeX: parseInt(el.attr("data-ws-sizex"), 10),
                    SizeY: parseInt(el.attr("data-ws-sizey"), 10),
                    MaxSizeX: parseInt(el.attr("data-ws-max-sizex"), 10) || null,
                    MaxSizeY: parseInt(el.attr("data-ws-max-sizey"), 10) || null,
                    Element: el
                };
            
            //TODO: IsCanMoveTo widget.Element should be null
            if (this._options.IsAvoidOverlap && !this.IsCanMoveTo(widget))
            {
                $.extend(widget, this.GetNextPosition(widget.SizeX, widget.SizeY));
                el.attr(
                {
                    "data-ws-col": widget.Column,
                    "data-ws-row": widget.Row,
                    "data-ws-sizex": widget.SizeX,
                    "data-ws-sizey": widget.SizeY
                }).css(
                {
                    "left": this.GetColumnStyle(widget.Column),
                    "top": this.GetRowStyle(widget.Row),
                    "width": this.GetXStyle(widget.SizeX),
                    "height": this.GetYStyle(widget.SizeY)
                });
            }
            
            // attach Coords object to player.
            new Coords(el, widget);
            
            this.AddToGridMap(widget);
            
            if (this._options.Resize.IsEnabled)
            {
                var appendTo: string = this._options.Resize.HandleAppendTo;
                $(this._resizeHandleTemplate).appendTo(appendTo ? $(appendTo, el) : el);
            }
        }
        
        private AddToGridMap(widget: IWidget): void
        {
            //TODO: AddToGridMap
        }
        
        private GetColumnStyle(col: number): number
        {
            return ((col - 1) * this._options.BaseDimensions[0]) 
                + ((col - 1) * this._options.Margins[0]) 
                + (col * this._options.Margins[0]);
        }
        
        private GetRowStyle(row: number): number
        {
            return ((row - 1) * this._options.BaseDimensions[1]) 
                + ((row - 1) * this._options.Margins[1]) 
                + (row * this._options.Margins[1]);
        }
        
        private GetXStyle(x: number): number
        {
            return (x * this._options.BaseDimensions[0] 
                + (x - 1) * (this._options.Margins[0] * 2));
        }
        
        private GetYStyle(y: number): number
        {
            return (y * this._options.BaseDimensions[1] 
                + (y - 1) * (this._options.Margins[1] * 2));
        }
        
        private IsCanMoveTo(widget: IWidget, maxRows?: number): boolean
        {
            //TODO: IsCanMoveTo
            return false;
        }
        
        private GetNextPosition(sizeX: number, sizeY: number) : IWidget
        {
            //TODO: GetNextPosition
            return <IWidget>{};
        }

        private OnResize(): void
        {
            //TODO: OnResize
        }
        
        private OnStopResize(event: JQueryEventObject, data: DraggableData): void
        {
            //TODO: OnStopResize
        }
    }
}

(function($) 
{
    $.fn.Widgetster = function(options)
    {
        return this.each(function ()
        {
            var el = $(this);
            if (!el.data("Widgetster"))
            {
                el.data("Widgetster", new DS.Widgetster(el, options));
            }
        });
    };
})(jQuery);