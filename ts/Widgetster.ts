/// <reference path="IDimensions.ts" />
/// <reference path="IWidgetsterOptions.ts" />
/// <reference path="ICoordsData.ts" />
/// <reference path="ICollisionOptions.ts" />
/// <reference path="IDraggableOptions.ts" />
/// <reference path="ITouchEvents.ts" />
/// <reference path="IPointerData.ts" />
/// <reference path="IResizeOptions.ts" />
/// <reference path="IWidget.ts" />
/// <reference path="IResizeData.ts" />
/// <reference path="IResizeDirection.ts" />
/// <reference path="DraggableData.ts" />
/// <reference path="Coords.ts" />
/// <reference path="Cell.ts" />
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
            Selector: "li",
            Margins: [10, 10],
            BaseDimensions: [140, 140],
            ExtraRows: 0,
            ExtraCols: 0,
            MinCols: 1,
            MaxCols: null,
            MinRows: 15,
            SerializeParams: (widgetElement: JQuery, widget: IWidget) => { return widget; },
            Collision: <ICollisionOptions>{},
            Draggable: <IDraggableOptions>{},
            Resize: <IResizeOptions>
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
        private _resizedWidgetElements: JQuery;
        private _player: JQuery;
        private _helper: JQuery;
        private _previewHolder: JQuery;
        private _resizePreviewHolder: JQuery;
        
        private _minWidgetWidth: number;
        private _minWidgetHeight: number;
        private _containerWidth: number;
        private _colsCount: number;
        private _rowsCount: number;
        private _lastColumns: number[];
        private _lastRows: number[];
        private _basePosition: JQueryCoordinates = <JQueryCoordinates>{};
        private _resizeHandleTemplate: string;
        
        private _resizeApi: Draggable;
        private _dragApi: Draggable;
        private _collisionApi: Collision;
        
        private _collidersData: Collision[];
        private _fauxGrid: Coords[];
        private _gridMap: JQuery[][];
        
        private _cellsOccupiedByPlaceholder: Cell = new Cell();
        private _cellsOccupiedByPlayer: Cell = new Cell();

        private _playerGrid: IWidget;
        private _placeholderGrid: IWidget;
        
        private _resizeInitialData: IResizeData = <IResizeData>{};
        private _resizeLastData: IResizeData = <IResizeData>{};
        private _resizeMaxData: IResizeData = <IResizeData>{};
        private _resizeDirection: IResizeDirection = <IResizeDirection>{};
        
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
            this.SetDomGridHeight();
            this._wrapper.addClass("ready");
            
            var resizeHandle: string = "." + this._options.Resize.HandleClass;
            var draggableOptions: IDraggableOptions = $.extend(true, {}, this._options.Draggable, <IDraggableOptions>
            {
                OffsetLeft: this._options.Margins[0],
                ContainerWidth: this._containerWidth,
                IgnoreDragging: ["INPUT", "TEXTAREA", "SELECT", "BUTTON", resizeHandle],
                OnStart: $.proxy((event?: JQueryEventObject, data?: DraggableData) =>
                {
                    this._widgetElements.filter(".player-revert").removeClass("player-revert");
                    this._player = data.Player;                    
                    this._helper = data.Helper;
                    
                    this._helper.add(this._player).add(this._wrapper).addClass("dragging");
                    this._player.addClass("player");
                    
                    var coords = new Coords(this._player);
                    this._playerGrid = coords.Grid;
                    this._placeholderGrid = $.extend({}, this._playerGrid);
                    
                    this._el.css("height", this._el.height() + (this._playerGrid.SizeY * this._minWidgetHeight));
                    
                    this._cellsOccupiedByPlayer = this.GetCellsOccupied(this._playerGrid);
                    this._cellsOccupiedByPlaceholder = this.GetCellsOccupied(this._placeholderGrid);
                    
                    this._lastColumns = [];
                    this._lastRows = [];
                    
                    this._collisionApi = new Collision(this._helper, this._fauxGrid, this._options.Collision);
                    
                    var playerRow: number = parseInt(this._player.attr('data-ws-row'));
                    var playerCol: number = parseInt(this._player.attr('data-ws-col'));
                    this._previewHolder = $("<" + this._player.get(0).tagName + " />",
                    {
                        "class": "preview-holder",
                        "data-ws-row": playerRow,
                        "data-ws-col": playerCol,
                        css: 
                        {
                            "left": this.GetColumnStyle(playerCol),
                            "top": this.GetRowStyle(playerRow),
                            "width": coords.Width,
                            "height": coords.Height
                        }
                    }).appendTo(this._el);
                    
                    if (this._options.Draggable.OnStart)
                    {
                        this._options.Draggable.OnStart.call(this, event, data);
                    }
                    
                    this._el.trigger("dragstart.widgetster");
                }, this),
                OnStop: $.proxy((event?: JQueryEventObject, data?: DraggableData) =>
                {
                    this._helper.add(this._player).add(this._wrapper).removeClass("dragging");
                    
                    data.Position.left += this._basePosition.left;
                    data.Position.top += this._basePosition.top;
                    
                    this._collidersData = this._collisionApi.GetClosestColliders(<ICoordsData>
                    {
                        Left: data.Position.left,
                        Top: data.Position.top
                    });
                    
                    this.OnOverlappedColumnChange(this.OnStartOverlappingColumn, this.OnStopOverlappingColumn);
                    this.OnOverlappedRowChange(this.OnStartOverlappingRow, this.OnStopOverlappingRow);
                    
                    this._player.addClass("player-revert").removeClass("player")
                        .attr(
                        {
                            "data-ws-col": this._placeholderGrid.Column,
                            "data-ws-row": this._placeholderGrid.Row
                        })
                        .css(
                        {
                            "left": this.GetColumnStyle(this._placeholderGrid.Column),
                            "top": this.GetRowStyle(this._placeholderGrid.Row)
                        });
                    
                    
                    this._changedWidgetElements = this._changedWidgetElements.add(this._player);
                    
                    this._cellsOccupiedByPlayer = this.GetCellsOccupied(this._placeholderGrid);
                    this.RemoveFromGridMap(this._placeholderGrid);
                    this.UpdateWidgetPosition(this._placeholderGrid, this._player);            
                    this.GetWidgetsBelow(this._placeholderGrid).forEach($.proxy((w?, i?) => { this.MoveWidgetUp(w) }, this));

                    Coords.UpdateGrid(this._player, <IWidget>{ Column: this._placeholderGrid.Column, Row: this._placeholderGrid.Row });
                    
                    if (this._options.Draggable.OnStop)
                    {
                        this._options.Draggable.OnStop.call(this, event, data);
                    }
                    
                    this._previewHolder.remove();
                    this._player = null;
                    this._helper = null;
                    this._placeholderGrid = <IWidget>{};
                    this._playerGrid = <IWidget>{};
                    this._cellsOccupiedByPlaceholder = <Cell>{};
                    this._cellsOccupiedByPlayer = <Cell>{};
                    
                    this.SetDomGridHeight();                    
                    this._el.trigger("dragstop.widgetster");
                }, this),
                OnDrag: Utils.Throttle((event: JQueryEventObject, data: DraggableData) => 
                {
                    if (this._player == null)
                    {
                        return;
                    }
                    
                    this._collidersData = this._collisionApi.GetClosestColliders(<ICoordsData>
                    {
                        Left: data.Position.left + this._basePosition.left,
                        Top: data.Position.top + this._basePosition.top
                    });
                    
                    this.OnOverlappedColumnChange(this.OnStartOverlappingColumn, this.OnStopOverlappingColumn);
                    this.OnOverlappedRowChange(this.OnStartOverlappingRow, this.OnStopOverlappingRow);
                    
                    if (this._helper && this._player)
                    {
                        this._player.css(
                        {
                            "left": data.Position.left,
                            "top": data.Position.top
                        });
                    }
                    
                    if (this._options.Draggable.OnDrag)
                    {
                        this._options.Draggable.OnDrag.call(this, event, data);
                    }
                    
                    this._el.trigger("drag.widgetster");
                }, 60)
            });
            
            this._dragApi = new Draggable(this._el, draggableOptions);
            
            if (this._options.Resize.IsEnabled)
            {
                this._resizeApi = new Draggable(this._el, <IDraggableOptions>
                {
                    Items: resizeHandle,
                    Distance: 1,
                    OffsetLeft: this._options.Margins[0],
                    ContainerWidth: this._containerWidth,
                    IsMoveElement: false,
                    OnDrag: Utils.Throttle($.proxy((event?, data?) => { this.OnResize(event, data); }, this), 60),
                    OnStart: $.proxy((event?, data?) => { this.OnStartResize(event, data); }, this),
                    OnStop: $.proxy((event?, data?) => { Utils.Delay($.proxy(() => { this.OnStopResize(event, data); }, this), 120); }, this)
                });
            }
            
            this._windowElement.bind("resize.widgetster", Utils.Throttle($.proxy(this.ReCalculateFauxGrid, this), 200));
            
            return this;            
        }
        
        /**
        * Enables dragging.
        *
        * @method EnableDragging
        */
        public EnableDragging(): void
        {
            this._dragApi.Enable();
        }
        
        /**
        * Disables dragging.
        *
        * @method DisableDragging
        */
        public DisableDragging(): void
        {
            this._wrapper.find(".player-revert").removeClass("player-revert");
            this._dragApi.Disable();
        }
        
        /**
        * Enables resizing.
        *
        * @method EnableResize
        */
        public EnableResize(): void
        {
            this._el.removeClass("ws-resize-disabled");
            this._resizeApi.Enable();
        }
        
        /**
        * Disables resizing.
        *
        * @method DisableResize
        */
        public DisableResize(): void
        {
            this._el.addClass("ws-resize-disabled");
            this._resizeApi.Disable();
        }
        
        /**
        * Adds a new widget to the grid.
        *
        * @method AddWidget
        * @param {JQuery} [widget] The jQuery wrapped HTMLElement representing the widget.
        * @param {Number} [sizeX] The number of columns that will occupy the widget.
        * @param {Number} [sizeY] The number of rows that will occupy the widget.
        * @param {Number} [column] The column the widget should start in.
        * @param {Number} [row] The row the widget should start in.
        * @param {Number[]} [maxSize] Maximun size (in units) for width and height.
        * @return {JQuery} Returns widget.
        */
        public AddWidget(widget: JQuery, sizeX?: number, sizeY?: number, column?: number, row?: number, maxSize?: number[]): JQuery
        {
            sizeX || (sizeX = 1);
            sizeY || (sizeY = 1);
            
            var position: IWidget = null;
            
            if (!column || !row)
            {
                position = this.GetNextPosition(sizeX, sizeY);
            }
            else
            {
                position = <IWidget>
                { 
                    Column: column, 
                    Row: row,
                    SizeX: sizeX,
                    SizeY: sizeY
                };
                this.MoveWidgetsToCell(position, null, false);
            }
            
            var addedWidget: JQuery = widget.attr(
            {
                "data-ws-col": position.Column,
                "data-ws-row": position.Row,
                "data-ws-sizex": position.SizeX,
                "data-ws-sizey": position.SizeY
            }).css(
            {
                "left": this.GetColumnStyle(position.Column),
                "top": this.GetRowStyle(position.Row),
                "width": this.GetXStyle(position.SizeX),
                "height": this.GetYStyle(position.SizeY)
            }).addClass("ws-w").appendTo(this._el).hide();
            
            this._widgetElements = this._widgetElements.add(addedWidget);
            this.RegisterWidget(addedWidget);
            this.AddFauxRows(position.SizeY);
            
            if (maxSize)
            {
                Coords.UpdateGrid(addedWidget, <IWidget>{ MaxSizeX: maxSize[0], MaxSizeY: maxSize[1] });
            }
            
            this.SetDomGridHeight();
            
            return addedWidget.fadeIn();
        }
        
        /**
        * Removes a widget from the grid.
        *
        * @method RemoveWidget
        * @param {JQuery} [widget] The jQuery wrapped HTMLElement representing the widget.
        * @param {Boolean} [isSilent] If true, widgets below the removed one will not move up. 
        * @param {Function} [callback] Function executed when the widget is removed.
        */
        public RemoveWidget(widget: JQuery, isSilent: boolean, callback?: Function): void
        {
            var wgd: IWidget = new Coords(widget).Grid;
            this._cellsOccupiedByPlaceholder = new Cell();
            this._widgetElements = this._widgetElements.not(widget);
            
            var nextWidgets: JQuery[] = null;
            if (!isSilent)
            {
                nextWidgets = this.GetWidgetsBelow(wgd);
            }
            
            this.RemoveFromGridMap(wgd);
            
            widget.fadeOut($.proxy(() => 
            {
                widget.remove();
                if (nextWidgets != null)
                {
                    nextWidgets.forEach($.proxy((w?, i?) => { this.MoveWidgetUp(w); }, this));
                }
                
                this.SetDomGridHeight();
                
                if (callback)
                {
                    callback.call(this, widget);
                }
            }, this));
        }
        
        /**
        * Removes all widgets from the grid.
        *
        * @method RemoveAllWidgets
        * @param {Function} [callback] Function executed for each widget removed.
        */
        public RemoveAllWidgets(callback?: Function): void
        {
            this._widgetElements.each($.proxy((i?, w?) => { this.RemoveWidget($(w), true, callback) }, this));
        }
        
        /**
        * Changes the size of a widget. Width is limited to the current grid width.
        *
        * @method ResizeWidget
        * @param {JQuery} [widget] The jQuery wrapped HTMLElement representing the widget.
        * @param {Number} [sizeX] The number of columns that will occupy the widget.
        * @param {Number} [sizeY] The number of rows that will occupy the widget.
        * @param {Boolean} [isReposition] Set to false to not move the widget to
        *  the left if there is insufficient space on the right.
        *  By default <code>sizeX</code> is limited to the space available from
        *  the column where the widget begins, until the last column to the right.
        * @param {Number} [row] The row.
        * @param {Function} [callback] Function executed when the widget is resized.
        * @return {JQuery} Returns widget.
        */
        public ResizeWidget(widget: JQuery, sizeX: number, sizeY: number, isReposition?: boolean, row?: number, callback?: Function): JQuery
        {
            if (row != null)
            {
                widget.attr("data-ws-row", row);
            }
            
            var widgetCoords: Coords = new Coords(widget);
            var widgetData: IWidget = widgetCoords.Grid;
            sizeX || (sizeX = widgetData.SizeX);
            sizeY || (sizeY = widgetData.SizeY);
            (isReposition != null) || (isReposition = true);
            
            if (sizeX > this._colsCount)
            {
                sizeX = this._colsCount;
            }
            
            var oldSizeX: number = widgetData.SizeX;
            var oldSizeY: number = widgetData.SizeY;
            var oldColumn: number = widgetData.Column;
            var newColumn: number = oldColumn;
            
            if (isReposition && oldColumn + sizeX - 1 > this._colsCount)
            {
                newColumn = Math.max(1, this._colsCount + 1 - sizeX);
            }
            
            if (sizeY > oldSizeY)
            {
                this.AddFauxRows(Math.max(sizeY - oldSizeY, 0));
            }
            
            var newWidgetData: IWidget = <IWidget>
            {
                Column: newColumn,
                Row: row || widgetData.Row,
                SizeX: sizeX,
                SizeY: sizeY
            };
            
            var oldCellsOccupied: Cell = this.GetCellsOccupied(widgetData);
            var newCellsOccupied: Cell = this.GetCellsOccupied(newWidgetData);
            
            var emptyColumns: number[] = [];
            $.each(oldCellsOccupied.Columns, (i, c) =>
            {
                if ($.inArray(c, newCellsOccupied.Columns) === -1)
                {
                    emptyColumns.push(c);
                }
            });
            
            var occupiedColumns: number[] = [];
            $.each(newCellsOccupied.Columns, (i, c) =>
            {
                if ($.inArray(c, oldCellsOccupied.Columns) === -1)
                {
                    occupiedColumns.push(c);
                }
            });
            
            var emptyRows: number[] = [];
            $.each(oldCellsOccupied.Rows, (i, r) =>
            {
                if ($.inArray(r, newCellsOccupied.Rows) === -1)
                {
                    emptyRows.push(r);
                }
            });
            
            var occupiedRows: number[] = [];
            $.each(newCellsOccupied.Rows, (i, r) =>
            {
                if ($.inArray(r, oldCellsOccupied.Rows) === -1)
                {
                    occupiedRows.push(r);
                }
            });
            
            this.RemoveFromGridMap(widgetData);
            
            if (occupiedColumns.length)
            {
                this.MoveWidgetsToCell(<IWidget>
                {
                    Column: newWidgetData.Column,
                    Row: newWidgetData.Row,
                    SizeX: newWidgetData.SizeX,
                    SizeY: Math.min(oldSizeY, newWidgetData.SizeY)
                }, widget, false);
            }
            
            if (occupiedRows.length)
            {
                this.MoveWidgetsToCell(newWidgetData, widget, false);
            }
            
            widgetData.Column = newWidgetData.Column;
            widgetData.Row = newWidgetData.Row;
            widgetData.SizeX = newWidgetData.SizeX;
            widgetData.SizeY = newWidgetData.SizeY;
            
            this.AddToGridMap(widgetData);
            widget.removeClass("player-revert");
            
            widgetCoords.Update(<ICoordsData>
            {
                Width: (newWidgetData.SizeX * this._options.BaseDimensions[0] + ((newWidgetData.SizeX - 1) * this._options.Margins[0]) * 2),
                Height: (newWidgetData.SizeY * this._options.BaseDimensions[1] + ((newWidgetData.SizeY - 1) * this._options.Margins[1]) * 2)
            });
            
            widget.attr(
            {
                "data-ws-col": newWidgetData.Column,
                "data-ws-row": newWidgetData.Row,
                "data-ws-sizex": newWidgetData.SizeX,
                "data-ws-sizey": newWidgetData.SizeY
            }).css(
            {
                "left": this.GetColumnStyle(newWidgetData.Column),
                "top": this.GetRowStyle(widgetData.Row),
                "width": this.GetXStyle(widgetData.SizeX),
                "height": this.GetYStyle(widgetData.SizeY)
            });
            
            if (emptyColumns.length)
            {
                this.MoveWidgetsToCell(<IWidget>
                {
                    Column: emptyColumns[0],
                    Row: newWidgetData.Row,
                    SizeX: emptyColumns.length,
                    SizeY: Math.min(oldSizeY, newWidgetData.SizeY)
                }, widget, true);
            }
            
            if (emptyRows.length)
            {
                this.MoveWidgetsToCell(newWidgetData, widget, true);
            }
            
            this.MoveWidgetUp(widget);
            
            this.SetDomGridHeight();
            
            if (callback)
            {
                callback.call(this, sizeX, sizeY);
            }
            
            return widget;
        }
        
        /**
         * Resizes widget dimensions, such as Margins and BaseDimensions.
         * 
         * @method ResizeWidgetDimensions
         * @param {IDimensions} [dimensions] The new dimensions.
         * @param {Boolean} [isIgnoreEquals] Set to true to apply changing dimensiosn even
         * old and new dimensions are equals.
         */ 
        public ResizeWidgetDimensions(dimensions: IDimensions, isIgnoreEquals: boolean): void
        {
            var isMarginsChanged: boolean = false;
            var isDimensionsChanged: boolean = false;            
            
            if (dimensions.Margins)
            {
                if (!this.IsPairArraysEqual(this._options.Margins, dimensions.Margins))
                {
                    this._options.Margins = dimensions.Margins;
                    isMarginsChanged = true;
                }
            }
            
            if (dimensions.BaseDimensions)
            {
                if (!this.IsPairArraysEqual(this._options.BaseDimensions, dimensions.BaseDimensions))
                {
                    this._options.BaseDimensions = dimensions.BaseDimensions;
                    isDimensionsChanged = true;
                }
            }
            
            if (!isDimensionsChanged && !isMarginsChanged && !isIgnoreEquals)
            {
                return;
            }
            
            this._minWidgetWidth = (this._options.Margins[0] * 2) + this._options.BaseDimensions[0];
            this._minWidgetHeight = (this._options.Margins[1] * 2) + this._options.BaseDimensions[1];
            
            var serializedGrid: any[] = this.GetSerializedWidgets();
            this._widgetElements.each($.proxy((i?, w?) =>
            {
                var widget: JQuery = $(w);
                var data: any = serializedGrid[i];
                this.ResizeWidget(widget, data.SizeX, data.SizeY);
            }, this));
            
            this.GenerateGrid();
            this.GetWidgetsFromDom(true);
            this.SetDomGridHeight();
        }
        
        /**
        * Returns a serialized array of the widgets in the grid.
        *
        * @method GetSerializedWidgets
        * @param {JQuery} [widgets] The collection of jQuery wrapped HMLElements you want to serialize. 
        * If no argument is passed all widgets will be serialized.
        * @return {Array} Returns an Array of Objects with the data specified in
        *  the SerializeParams option.
        */
        public GetSerializedWidgets<T>(widgets?: JQuery): T[]
        {
            widgets || (widgets = this._widgetElements);
            var result: T[] = [];
            
            widgets.each($.proxy((i?, w?) => 
            {
                var widget: JQuery = $(w);
                result.push(this._options.SerializeParams(widget, new Coords(widget).Grid));
            }, this));
            
            return result;
        }
        
        /**
        * Returns a serialized array of the widgets that have changed their position.
        *
        * @method GetSerializedChangedWidgets
        * @return {Array} Returns an Array of Objects with the data specified in
        *  the SerializeParams option.
        */
        public GetSerializedChangedWidgets<T>(): T[]
        {
            return this.GetSerializedWidgets<T>(this._changedWidgetElements);
        }
        
        private IsPairArraysEqual(a: number[], b: number[]): boolean
        {
            return (a[0] == b[0] && a[1] == b[1]);
        }
        
        private OnStartOverlappingColumn(column: number)
        {
            this.SetPlayer(null);
        }
        
        private OnStopOverlappingColumn(column: number)
        {
            this.SetPlayer(null);
            this.ForEachWidgetBelow(column, this._cellsOccupiedByPlayer.Rows[0], (w, c, r) => { this.MoveWidgetUp(w); });
        }
        
        private OnOverlappedColumnChange(startCallback: Function, stopCallback: Function): void
        {
            if (!this._collidersData.length)
            {
                return;
            }
            
            var columns: number[] = [];
            var fromColumn: number = this._collidersData[0].ColliderCoords.Data.Column;
            var max = (fromColumn || this._playerGrid.Column) + (this._playerGrid.SizeX - 1);
            for (var c = fromColumn; c <= max; c++)
            {
                columns.push(c);
            }
            
            for (var i = 0, nCols = columns.length; i < nCols; i++)
            {
                if ($.inArray(columns[i], this._lastColumns) === -1)
                {
                    (startCallback || $.noop).call(this, columns[i]);
                }
            }
            
            for (var i = 0, nCols = this._lastColumns.length; i < nCols; i++)
            {
                if ($.inArray(this._lastColumns[i], columns) === -1)
                {
                    (stopCallback || $.noop).call(this, this._lastColumns[i]);
                }
            }
            
            this._lastColumns = columns;
        }
        
        private OnStartOverlappingRow(row: number)
        {
            this.SetPlayer(row);
        }
        
        private OnStopOverlappingRow(row: number)
        {
            this.SetPlayer(row);
            var columns: number[] = this._cellsOccupiedByPlayer.Columns;
            
            for (var c = 0, cl = columns.length; c < cl; c++)
            {
                this.ForEachWidgetBelow(columns[c], row, (w, c, r) => { this.MoveWidgetUp(w); });
            }
        }
        
        private OnOverlappedRowChange(startCallback: Function, stopCallback: Function): void
        {
            if (!this._collidersData.length)
            {
                return;
            }
            
            var rows: number[] = [];
            var fromRow: number = this._collidersData[0].ColliderCoords.Data.Row;
            var max = (fromRow || this._playerGrid.Row) + (this._playerGrid.SizeY - 1);
            for (var r = fromRow; r <= max; r++)
            {
                rows.push(r);
            }
            
            for (var i = 0, nRows = rows.length; i < nRows; i++)
            {
                if ($.inArray(rows[i], this._lastRows) === -1)
                {
                    (startCallback || $.noop).call(this, rows[i]);
                }
            }
            
            for (var i = 0, nRows = this._lastRows.length; i < nRows; i++)
            {
                if ($.inArray(this._lastRows[i], rows) === -1)
                {
                    (stopCallback || $.noop).call(this, this._lastRows[i]);
                }
            }
            
            this._lastRows = rows;
        }
        
        private SetPlayer(row: number): void
        {
            this.RemoveFromGridMap(this._placeholderGrid);
            
            var cell: ICoordsData = this._collidersData[0].ColliderCoords.Data;
            var thisColumn: number = cell.Column;
            var thisRow: number = row || cell.Row;
            
            this._playerGrid = <IWidget>
            {
                Column: thisColumn,
                Row: thisRow,
                SizeX: this._playerGrid.SizeX,
                SizeY: this._playerGrid.SizeY
            };
            
            this._cellsOccupiedByPlayer = this.GetCellsOccupied(this._playerGrid);
            
            var overpalledWidgets: JQuery = $([]);
            var usedWidgets: JQuery[] = [];
            var rowsFromBottom: number[] = this._cellsOccupiedByPlayer.Rows.slice(0);
            rowsFromBottom.reverse();
            
            $.each(this._cellsOccupiedByPlayer.Columns, $.proxy((i?, c?) =>
            {
                $.each(rowsFromBottom, $.proxy((i?, r?) => 
                {
                    // if there is a widget in the player position.
                    if (!this._gridMap[c])
                    {
                        return true;
                    }
                    
                    var w: JQuery = this._gridMap[c][r];
                    if (this.IsOccupied(c, r) && !this.IsPlayer(w) && $.inArray(w, usedWidgets) === -1)
                    {
                        overpalledWidgets = overpalledWidgets.add(w);
                        usedWidgets.push(w);
                    }
                }, this));
            }, this));
            
            var widgetsCanGoUp: IWidget[] = [];
            var widgetsCanNotGoUp: IWidget[] = [];
            
            overpalledWidgets.each($.proxy((i?, w?) =>
            {
                var wgd: IWidget = new Coords($(w)).Grid;
                if (this.IsCanGoUp(wgd))
                {
                    widgetsCanGoUp.push(wgd);
                }
                else
                {
                    widgetsCanNotGoUp.push(wgd);
                }
            }, this));
            
            this.ManageMovements(this.SortWidgetsByRowAsc(widgetsCanGoUp), thisColumn, thisRow);
            this.ManageMovements(widgetsCanNotGoUp.sort((a, b) => { return (a.Row + a.SizeY < b.Row + b.SizeY) ? 1: -1; }), thisColumn, thisRow);
            
            // if there is not widgets overlapping in the new player position, update the new placeholder position.
            if (!overpalledWidgets.length)
            {
                var playerRow: number = this.GetRowForGoPlayerUp(this._playerGrid);
                if (playerRow > 0)
                {
                    thisRow = playerRow;
                }
                this.SetPlaceholder(thisColumn, thisRow);
            }            
        }
        
        private GetRowForGoWidgetUp(widget: IWidget): number
        {
            return this.GetRowForGoUp(widget, true);
        }
        
        private GetRowForGoPlayerUp(widget: IWidget): number
        {
            return this.GetRowForGoUp(widget, false);
        }
        
        private GetRowForGoUp(widget: IWidget, isWidget: boolean): number
        {
            var isCanGoUp: boolean = true;
            var minRow: number = Number.MAX_VALUE;
            var bottomRow: number = widget.Row + widget.SizeY;
            var upperRows: number[][] = [];
            var widgetsUnderPlayer: JQuery = null;
            if (!isWidget)
            {
                widgetsUnderPlayer = this.GetWidgetsUnderPlayer();
            }
            
            this.ForEachColumnOccupied(widget, (c) =>
            {
                var gridColumn: JQuery[] = this._gridMap[c];
                var r = bottomRow;
                upperRows[c] = [];
                
                while(--r > 0)
                {
                    if (isWidget)
                    {
                        if (this.GetWidgetElement(c, r) != null 
                            && !this.IsPlayerIn(c, r)
                            && !gridColumn[r].is(widget.Element))
                        {
                            break;
                        }
                        
                        if (!this.IsPlayerInGrid(c, r) 
                            && !this.IsPlaceholderIn(c, r) 
                            && !this.IsPlayerIn(c, r))
                        {
                            upperRows[c].push(r);
                        }
                        
                        minRow = r < minRow ? r : minRow;
                    }
                    else
                    {
                        if (this.IsEmpty(c, r) 
                            || this.IsPlayerInGrid(c, r) 
                            || (this.GetWidgetElement(c, r) != null && gridColumn[r].is(widgetsUnderPlayer)))
                        {
                            upperRows[c].push(r);
                            minRow = r < minRow ? r : minRow;
                        }
                        else
                        {
                            break;
                        }
                    }                    
                }
                
                if (upperRows[c].length === 0)
                {
                    isCanGoUp = false;
                    return true;
                }
                
                upperRows[c].sort((a, b) => {return a - b; });
            });
            
            if (!isCanGoUp)
            {
                return 0;
            }
            
            var validRows: number[] = [];
            var row: number = minRow - 1;
            
            while(++row <= bottomRow)
            {
                var isCommon: boolean = true;
                $.each(upperRows, (c, r) =>
                {
                    if ($.isArray(r) && $.inArray(row, r) === -1)
                    {
                        isCommon = false;
                    }
                });
                
                if (isCommon)
                {
                    validRows.push(row);
                    if (validRows.length == widget.SizeY)
                    {
                        break;
                    }
                }
            }
            
            var result: number = 0;
            if (validRows[0] != widget.Row)
            {
                if (widget.SizeY == 1)
                {
                    result = validRows[0] || 0;
                }
                else
                {
                    var isFirst: boolean = true;
                    var previous: number = -1;
                    var resultRows: number[] = [];
                    for (var i = 0, max = validRows.length; i < max; i++)
                    {
                        if (isFirst || validRows[i] == previous + 1)
                        {
                            resultRows.push(i)
                            if (resultRows.length == widget.SizeY)
                            {
                                break;
                            }
                            isFirst = false;
                        }
                        else
                        {
                            resultRows = [];
                            isFirst = true;
                        }
                        
                        previous = validRows[i];
                    }
                    
                    result = (resultRows.length >= widget.SizeY) ? validRows[resultRows[0]] : 0;
                }
            }
            
            return result;
        }
        
        private SetPlaceholder(column: number, row: number): void
        {         
            var nextWidgets: JQuery[] = this.GetWidgetsBelow(this._placeholderGrid);
            
            // Prevents widgets go out of the grid.
            var rightColumn: number = (column + this._placeholderGrid.SizeX - 1);
            if (rightColumn > this._colsCount)
            {
                column = column - (rightColumn - column);
            }
            
            var isMovedDown: boolean = this._placeholderGrid.Row < row;
            var isChangedColumn: boolean = this._placeholderGrid.Column != column;
            
            this._placeholderGrid.Column = column;
            this._placeholderGrid.Row = row;
            
            this._cellsOccupiedByPlaceholder = this.GetCellsOccupied(this._placeholderGrid);
            
            this._previewHolder.attr({ "data-ws-row": row, "data-ws-col": column })
                .css({ "left": this.GetColumnStyle(column), "top": this.GetRowStyle(row) });
            
            if (isMovedDown || isChangedColumn)
            {
                nextWidgets.forEach($.proxy((w?, i?) => { this.MoveWidgetUp(w); }, this));
            }
            
            var widgetsUnderPlaceholder: JQuery = this.GetWidgetsUnderPlayer(this._cellsOccupiedByPlaceholder);
            if (widgetsUnderPlaceholder.length)
            {
                widgetsUnderPlaceholder.each($.proxy((i?, w?) =>
                {
                    var el: JQuery = $(w);
                    this.MoveWidgetDown(el, row + this._placeholderGrid.SizeY - new Coords(el).Grid.Row);
                }, this));
            }
        }
        
        private GetWidgetsUnderPlayer(cells?: Cell): JQuery
        {
            cells || (cells = this._cellsOccupiedByPlayer || <Cell>{ Columns: [], Rows: [] });
            var widgets: JQuery = $([]);
            
            $.each(cells.Columns, $.proxy((i?, c?) =>
            {
                $.each(cells.Rows, $.proxy((i?, r?) =>
                {
                    var w: JQuery = this.GetWidgetElement(c, r);
                    if (w != null)
                    {
                        widgets = widgets.add(w);
                    }
                }, this));
            }, this));
            
            return widgets;
        }
        
        private ManageMovements(widgets: IWidget[], column: number, row: number): void
        {
            $.each(widgets, $.proxy((i?, w?: IWidget) =>
            {
                var rowForGoUp: number = this.GetRowForGoWidgetUp(w);
                if (rowForGoUp != 0)
                {
                    // Target can go up, so move widget up.
                    this.MoveWidgetTo(w.Element, rowForGoUp);
                    this.SetPlaceholder(column, rowForGoUp + w.SizeY);
                }
                else if (this.GetRowForGoPlayerUp(this._playerGrid) == 0)
                {
                    // Target and player can not go up. 
                    // We need to move widget down to a position that don't overlaps palyer.
                    this.MoveWidgetDown(w.Element, ((row + this._playerGrid.SizeY) - w.Row));
                    this.SetPlaceholder(column, row);
                }
            }, this));
        }
        
        private SetDomGridHeight(): void
        {
            var rows: number[] = [];            
            for(var c = this._gridMap.length - 1; c >= 1; c--)
            {
                for (var r = this._gridMap[c].length - 1; r >= 1; r--)
                {
                    if (this.GetWidgetElement(c, r) != null)
                    {
                        rows.push(r);
                        break;
                    }
                }
            }            
            var row: number = Math.max.apply(Math, rows);
            
            this._el.css("height", row * this._minWidgetHeight);
        }
        
        private GetWidgetElement(col: number, row: number): JQuery
        {
            var cell = this._gridMap[col];
            return !cell ? null : cell[row];
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
        
        private AddFauxRows(rows: number): void
        {
            var actualRows: number = this._rowsCount;
            var maxRows: number = actualRows + (rows || 1);
            
            for (var r = maxRows; r > actualRows; r--)
            {
                for (var c = this._colsCount; c >= 1; c--)
                {
                    this.AddFauxCell(r, c);
                }
            }
            
            this._rowsCount = maxRows;
        }
        
        private AddFauxCell(row: number, col: number): void
        {
            if (!$.isArray(this._gridMap[col]))
            {
                this._gridMap[col] = [];
            }
            this._gridMap[col][row] = null;
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
        
        private GetWidgetsFromDom(isCheckOverlaping?: boolean): void
        {
            this._widgetElements.each($.proxy((i?, w?) => { this.RegisterWidget($(w), isCheckOverlaping); }, this));
        }
        
        private RegisterWidget(el: JQuery, isCheckOverlaping?: boolean): void
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
            if (isCheckOverlaping && !this.IsCanMoveTo(widget, true))
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
            this.UpdateWidgetPosition(widget, widget.Element);            
            this.GetWidgetsBelow(widget).forEach($.proxy((w?, i?) => { this.MoveWidgetUp(w) }, this));
        }
        
        private RemoveFromGridMap(widget: IWidget): void
        {
            this.UpdateWidgetPosition(widget, null);
        }
        
        private UpdateWidgetPosition(widget: IWidget, value: JQuery): void
        {
            this.ForEachCellOccupied(widget, (col, row) => 
            {
                if (this._gridMap[col])
                {
                    this._gridMap[col][row] = value;
                }
            });
        }
        
        private ForEachCellOccupied(widget: IWidget, callback: Function): void
        {
            this.ForEachColumnOccupied(
                widget, 
                (col) => { this.ForEachRowOccupied(widget, (row) => { callback.call(this, col, row); }); });
        }
        
        private ForEachRowOccupied(widget: IWidget, callback: Function): void
        {
            for (var i = 0; i < widget.SizeY; i++)
            {
                callback.call(this, widget.Row + i);
            }
        }
        
        private ForEachColumnOccupied(widget: IWidget, callback: Function): void
        {
            for (var i = 0; i < widget.SizeX; i++)
            {
                callback.call(this, widget.Column + i);
            }
        }
        
        private ForEachWidgetBelow(col: number, row: number, callback: Function): void
        {
            var widgetsInColumn: JQuery[] = this._gridMap[col];
            if (!widgetsInColumn)
            {
                return;
            }
            
            var max: number;
            var matched: JQuery[] = [];
            var tempRow: number = row;
            
            for (tempRow = row + 1, max = widgetsInColumn.length; tempRow < max; tempRow++)
            {
                var widgetElement: JQuery = widgetsInColumn[tempRow];
                if (this.GetWidgetElement(col, tempRow) != null && $.inArray(widgetElement, matched) === -1)
                {                    
                    matched.push(widgetElement);
                    if (callback.call(widgetElement, widgetElement, col, tempRow))
                    {
                        break;
                    }
                }
            }
        }
        
        private GetWidgetsBelow(widget: IWidget): JQuery[]
        {
            var nextRow: number = widget.Row + widget.SizeY - 1;
            var result: JQuery[] = [];
            
            this.ForEachColumnOccupied(widget, (col) =>
            {
                this.ForEachWidgetBelow(col, nextRow, (w, c, r) =>
                {
                    if (!this.IsPlayer(w) && $.inArray(w, result) === -1)
                    {
                        result.push(w);
                        return true;
                    }
                });
            });
            
            return this.SortWidgetsElementsByRowAsc(result);
        }
        
        private MoveWidgetTo(el: JQuery, row: number): void
        {
            var widget: IWidget = new Coords(el).Grid;
            var nextWidgets: JQuery[] = this.GetWidgetsBelow(widget);
            
            if (!this.IsCanMoveTo(<IWidget>
                {
                    Column: widget.Column,
                    Row: row,
                    Element: widget.Element,
                    SizeX: widget.SizeX,
                    SizeY: widget.SizeY,
                }, false))
            {
                return;
            }
            
            this.RemoveFromGridMap(widget);
            widget.Row = row;
            this.AddToGridMap(widget);
            el.attr("data-ws-row", row).css("top", this.GetRowStyle(row));
            this._changedWidgetElements = this._changedWidgetElements.add(el);
            
            nextWidgets.forEach($.proxy((w?, i?) => 
            { 
                var wgd: IWidget = new Coords(w).Grid;
                var rowForGoUp: number = this.GetRowForGoWidgetUp(wgd);
                if (rowForGoUp > 0 && rowForGoUp != wgd.Row)
                {
                    this.MoveWidgetTo(w, rowForGoUp);
                }
            }, this));
        }
                
        private MoveWidgetUp(el: JQuery): void
        {
            var widget: IWidget = new Coords(el).Grid;
            var actualRow = widget.Row;
            var movedWidgets: JQuery[] = [];
            
            if (!this.IsCanGoUp(widget))
            {
                return;
            }
            
            this.ForEachColumnOccupied(widget, (col) =>
            {
                if ($.inArray(el, movedWidgets) === -1)                
                {
                    var nextRow: number = this.GetNextRow(widget);
                    
                    if (nextRow == 0)
                    {
                        return true;
                    }
                    
                    var nextWidgets: JQuery[] = this.GetWidgetsBelow(widget);
                    
                    this.RemoveFromGridMap(widget);
                    widget.Row = nextRow;
                    this.AddToGridMap(widget);
                    el.attr("data-ws-row", widget.Row).css("top", this.GetRowStyle(widget.Row));
                    
                    this._changedWidgetElements = this._changedWidgetElements.add(el);                    
                    movedWidgets.push(el);
                    
                    nextWidgets.forEach($.proxy((w?, i?) => { this.MoveWidgetUp(w); }, this));
                }
            });            
        }
        
        private MoveWidgetDown(el: JQuery, yUnits: number): void
        {
            if (yUnits <= 0 || !el)
            {
                return;
            }
            
            var widget: IWidget = new Coords(el).Grid;
            var actualRow: number = widget.Row;
            var yDiff: number = yUnits;
            var movedWidgets: JQuery[] = [];
            
            if ($.inArray(el, movedWidgets) === -1)
            {
                var nextRow: number = actualRow + yUnits;
                var nextWidgets: JQuery[] = this.GetWidgetsBelow(widget);
                this.RemoveFromGridMap(widget);
                
                nextWidgets.forEach($.proxy((w?, i?) => 
                { 
                    var wgd: JQuery = $(w);
                    var wgdGrid: IWidget = new Coords(wgd).Grid;
                    
                    // --displacement diff---
                    var ddDiffs: number[] = [];
                    var ddActualRow: number = wgdGrid.Row;
                    var ddParentMaxY: number = widget.Row + widget.SizeY;
                    
                    this.ForEachColumnOccupied(wgdGrid, (c) =>
                    {
                        var ddTempYUnits: number = 0;
                        
                        for(var r = ddParentMaxY; r < ddActualRow; r++)
                        {
                            if (this.IsEmpty(c, r))
                            {
                                ddTempYUnits++;
                            }
                        }
                        
                        ddDiffs.push(ddTempYUnits);
                    });
                    
                    var ddYUnits = (yDiff - Math.max.apply(Math, ddDiffs));
                    
                    var displacementDiff: number = ddYUnits > 0 ? ddYUnits : 0;
                    //------------------------
                    
                    if (displacementDiff > 0)
                    {
                        this.MoveWidgetDown(wgd, displacementDiff);
                    }
                }, this));
                
                widget.Row = nextRow;
                this.UpdateWidgetPosition(widget, el);
                el.attr("data-ws-row", widget.Row).css("top", this.GetRowStyle(widget.Row));
                this._changedWidgetElements = this._changedWidgetElements.add(el);
                
                movedWidgets.push(el);
            }
        }
        
        private MoveWidgetsToCell(widget: IWidget, exclude: JQuery, isToUp: boolean): void
        {
            var nextWidgets: JQuery[] = this.GetWidgetsBelow(<IWidget>
            {
                Column: widget.Column,
                Row: (isToUp ? widget.Row : (widget.Row - widget.SizeY)),
                SizeX: widget.SizeX,
                SizeY: widget.SizeY
            });
            
            nextWidgets.forEach($.proxy((w?, i?) => 
            { 
                if (!w.is(exclude))
                {
                    if (isToUp)
                    {
                        this.MoveWidgetUp(w);
                    }
                    else
                    {
                        var wgd: IWidget = new Coords(w).Grid;
                        if (wgd.Row <= (widget.Row + widget.SizeY - 1))
                        {
                            this.MoveWidgetDown(w, ((widget.Row + widget.SizeY) - wgd.Row)); 
                        }
                    }
                }
            }, this));
            
            this.SetDomGridHeight();
        }
        
        private SortWidgetsElementsByRowAsc(widgets: JQuery[]): JQuery[]
        {
            return widgets.sort((a, b) => { return (new Coords(a).Grid.Row > new Coords(b).Grid.Row) ? 1 : -1; });
        }
        
        private SortWidgetsByRowAsc(widgets: IWidget[]): IWidget[]
        {
            return widgets.sort((a, b) => { return (a.Row > b.Row) ? 1 : -1; });
        }
        
        private GetNextRow(widget: IWidget): number
        {
            var result: number = 1;
            var actualRow: number = widget.Row;
            var upperRowsInColumn: number[][] = [];
            var r: number;
            
            this.ForEachColumnOccupied(widget, (c) =>
            {
                upperRowsInColumn[c] = [];
                r = actualRow;
                
                while(r--)
                {
                    if (this.IsEmpty(c, r)
                        && !this.IsPlaceholderIn(c, r))
                    {
                        upperRowsInColumn[c].push(r);
                    }
                    else
                    {
                        break;
                    }
                }
                
                if (!upperRowsInColumn[c].length)
                {
                    result = 0;
                    return true;
                }
            });
            
            if (result == 0)
            {
                return 0;
            }
            
            for (r = 1; r < actualRow; r++)
            {
                var isCommon: boolean = true;
                
                for (var uc = 0, ucl = upperRowsInColumn.length; uc < ucl; uc++)
                {
                    var ur: number[] = upperRowsInColumn[uc];
                    if (ur && $.inArray(r, ur) === -1)
                    {
                        isCommon = false;
                    }
                }
                
                if (isCommon)
                {
                    result = r;
                    break;
                }
            }            
            
            return result;
        }
        
        private IsEmpty(col: number, row: number)
        {
            if (typeof this._gridMap[col] != 'undefined')
            {
                if (typeof this._gridMap[col][row] != 'undefined'
                    && !this._gridMap[col][row])
                {
                    return true;
                }
                return false;
            }
            return true;
        }
        
        private IsPlayerInGrid(col: number, row: number): boolean
        {
            if (!this._gridMap[col])
            {
                return false;
            }

            return this.IsPlayer(this._gridMap[col][row]);
        }
        
        private IsPlayer(el: JQuery): boolean
        {
            return el && (el.is(this._player) || el.is(this._helper));
        }
        
        private GetCellsOccupied(widget: IWidget): Cell
        {
            var cells: Cell = new Cell();
            
            for (var i = 0; i < widget.SizeX; i++)
            {
                cells.Columns.push(widget.Column + i);
            }
            
            for (var i = 0; i < widget.SizeY; i++)
            {
                cells.Rows.push(widget.Row + i);
            }
            
            return cells;
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
        
        private IsCanGoUp(widget: IWidget): boolean
        {
            var initialRow: number = widget.Row;
            var prevRow: number = initialRow - 1;
            
            if (initialRow == 1)
            {
                return false;
            }
            
            var result: boolean = true;
            
            this.ForEachColumnOccupied(widget, (col) => 
            {
                if (this.IsOccupied(col, prevRow)
                    || this.IsPlayerInGrid(col, prevRow)
                    || this.IsPlaceholderIn(col, prevRow)
                    || this.IsPlayerIn(col, prevRow))
                {
                    result = false;
                    return true;
                }
            });
                        
            return result;
        }
        
        private IsPlaceholderIn(col: number, row: number): boolean
        {
            return $.inArray(col, this._cellsOccupiedByPlaceholder.Columns) >= 0 
                && $.inArray(row, this._cellsOccupiedByPlaceholder.Rows) >= 0;
        }
        
        private IsPlayerIn(col: number, row: number): boolean
        {
            return $.inArray(col, this._cellsOccupiedByPlayer.Columns) >= 0 
                && $.inArray(row, this._cellsOccupiedByPlayer.Rows) >= 0;
        }
        
        private IsOccupied(col: number, row: number): boolean
        {
            if (!this._gridMap[col])
            {
                return false;
            }
            
            if (this._gridMap[col][row])
            {
                return true;
            }
            
            return false;
        }
        
        private IsCanMoveTo(widget: IWidget, isNonSeeElement: boolean): boolean
        {
            var result: boolean = true;
            
            // Prevents widgets go out of the grid.
            if (((widget.Column + widget.SizeX - 1) > this._colsCount))
            {
                return false;
            }
            
            this.ForEachCellOccupied(widget, (col, row) => 
            {
                var widgetInGridMap = this.GetWidgetElement(col, row);
                if (widgetInGridMap != null && (isNonSeeElement || widgetInGridMap.is(widget.Element)))
                {
                    result = false;
                }
            });

            return result;
        }
        
        private GetNextPosition(sizeX: number, sizeY: number) : IWidget
        {
            sizeX || (sizeX = 1);
            sizeY || (sizeY = 1);
            
            var colsLength: number = this._gridMap.length;
            var rowsLength: number = 0;
            var validPositions: IWidget[] = [];
            
            for (var c = 1; c < colsLength; c++)
            {
                rowsLength = this._gridMap[c].length;
                for (var r = 1; r <= rowsLength; r++)
                {
                    var widget: IWidget = <IWidget>{ Column: c, Row: r, SizeX: sizeX, SizeY: sizeY };
                    if (this.IsCanMoveTo(widget, true))
                    {
                        validPositions.push(widget);
                    }
                }
            }
            
            if (validPositions.length > 0)
            {
                validPositions = validPositions.sort((a, b) => 
                {
                    return (a.Row > b.Row || a.Row == b.Row && a.Column > b.Column) ? 1 : -1;
                });
                return validPositions[0];
            }
            
            return null;
        }

        private OnResize(event: JQueryEventObject, data: DraggableData): void
        {
            var incUnitsX: number = Math.ceil((data.Pointer.DiffLeft / (this._options.BaseDimensions[0] + this._options.Margins[0] * 2)) - 0.2);
            var incUnitsY: number = Math.ceil((data.Pointer.DiffTop / (this._options.BaseDimensions[1] + this._options.Margins[1] * 2)) - 0.2);
            
            var sizeX: number = Math.max(1, this._resizeInitialData.SizeX + incUnitsX);
            sizeX = Math.min(sizeX, this._resizeMaxData.SizeX);
            
            var sizeY: number = Math.max(1, this._resizeInitialData.SizeY + incUnitsY);
            sizeY = Math.min(sizeY, this._resizeMaxData.SizeY);
            
            var maxWidth: number = (this._resizeMaxData.SizeX * this._options.BaseDimensions[0]) + ((sizeX - 1) * this._options.Margins[0] * 2);
            var maxHeight: number = (this._resizeMaxData.SizeY * this._options.BaseDimensions[1]) + ((sizeY - 1) * this._options.Margins[1] * 2);
            
            if (this._resizeDirection.IsRight)
            {
                sizeY = this._resizeInitialData.SizeY;
            }
            else if (this._resizeDirection.IsBottom)
            {
                sizeX = this._resizeInitialData.SizeX;
            }
            
            if (!this._resizeDirection.IsBottom)
            {
                this._resizedWidgetElements.css("width", Math.min(this._resizeInitialData.Width + data.Pointer.DiffLeft, maxWidth));
            }
            
            if (!this._resizeDirection.IsRight)
            {
                this._resizedWidgetElements.css("height", Math.min(this._resizeInitialData.Height + data.Pointer.DiffTop, maxHeight));
            }
            
            if (sizeX != this._resizeLastData.SizeX
                || sizeY != this._resizeLastData.SizeY)
            {
                this._resizedWidgetElements = this.ResizeWidget(this._resizedWidgetElements, sizeX, sizeY, false);
                
                this._resizePreviewHolder.css(
                    {
                        "top": this.GetRowStyle(parseInt(this._resizedWidgetElements.attr("data-ws-row"))),
                        "width": this.GetXStyle(sizeX),
                        "height": this.GetYStyle(sizeY)
                    }).attr(
                    {
                        "data-ws-row": this._resizedWidgetElements.attr("data-ws-row"),
                        "data-ws-sizex": sizeX,
                        "data-ws-sizey": sizeY
                    });
            }
            
            if (this._options.Resize.OnResize)
            {
                this._options.Resize.OnResize.call(this, event, data, this._resizedWidgetElements);
            }
            
            this._resizeLastData.SizeX = sizeX;
            this._resizeLastData.SizeY = sizeY;
        }
        
        private OnStopResize(event: JQueryEventObject, data: DraggableData): void
        {
            this._resizedWidgetElements.removeClass("resizing").css(
            { 
                "min-width": "", 
                "min-height": "",
                "width": this._resizePreviewHolder.css("width"), 
                "height": this._resizePreviewHolder.css("height")
            });
            
            Utils.Delay($.proxy(() => { this._resizePreviewHolder.remove().css({ "min-width": "", "min-height": "", "width": "", "height": "" }); }, this), 300);
            
            if (this._options.Resize.OnStop)
            {
                this._options.Resize.OnStop.call(this, event, data, this._resizedWidgetElements);
            }
        }
        
        private OnStartResize(event: JQueryEventObject, data: DraggableData): void
        {
            this._resizedWidgetElements = data.Player.closest(".ws-w");
            
            var resizeCoords: Coords = new Coords(this._resizedWidgetElements);
            var resizeGrid: IWidget = resizeCoords.Grid;
            this._resizeInitialData = 
            {
                Height: resizeCoords.Data.Height,
                Width: resizeCoords.Data.Width,
                SizeX: resizeGrid.SizeX,
                SizeY: resizeGrid.SizeY
            };
            this._resizeLastData = <IResizeData>
            {
                SizeX: this._resizeInitialData.SizeX,
                SizeY: this._resizeInitialData.SizeY
            };
            this._resizeMaxData = <IResizeData>
            {
                SizeX: Math.min(resizeGrid.MaxSizeX || this._options.Resize.MaxSize[0], this._colsCount - resizeGrid.Column + 1),
                SizeY: resizeGrid.MaxSizeY || this._options.Resize.MaxSize[1]
            };
            this._resizeDirection =
            {
                IsRight: data.Player.is("." + this._options.Resize.HandleClass + "-x"),
                IsBottom: data.Player.is("." + this._options.Resize.HandleClass + "-y"),
            };
            
            this._resizedWidgetElements.css(
                {
                    "min-width": this._options.BaseDimensions[0],
                    "min-height": this._options.BaseDimensions[1]
                });
            
            var row: number = parseInt(this._resizedWidgetElements.attr("data-ws-row"));
            var column: number = parseInt(this._resizedWidgetElements.attr("data-ws-col"));
            this._resizePreviewHolder = $("<" + this._resizedWidgetElements.get(0).tagName + " />", 
            {
                "class": "preview-holder resize-preview-holder",
                "data-ws-row": row,
                "data-ws-col": column,
                "css":
                {
                    "left": this.GetColumnStyle(column),
                    "top": this.GetRowStyle(row),
                    "width": this._resizeInitialData.Width,
                    "height": this._resizeInitialData.Height
                }
            }).appendTo(this._el);
            
            this._resizedWidgetElements.addClass("resizing");
            if (this._options.Resize.OnStart)
            {
                this._options.Resize.OnStart.call(this, event, data, this._resizedWidgetElements);
            }
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