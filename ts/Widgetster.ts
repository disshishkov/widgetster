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
        private _resizedWidgetElements: JQuery;
        private _player: JQuery;
        private _helper: JQuery;
        private _previewHolder: JQuery;
        
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
                    //TODO: on_stop_drag (insert here)
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
                    
                    //TODO: OnOverlappedColumnChange & OnOverlappedRowChange
                    
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
                    OnDrag: Utils.Throttle($.proxy(this.OnResize, this), 60),
                    OnStart: $.proxy((event?, data?) => { this.OnStartResize(event, data); }, this),
                    OnStop: $.proxy((event?, data?) =>
                        {
                            Utils.Delay($.proxy(() => { this.OnStopResize(event, data); }, this), 120);
                        }, this)
                });
            }
            
            this._windowElement.bind("resize.widgetster", Utils.Throttle($.proxy(this.ReCalculateFauxGrid, this), 200));
            
            return this;            
        }
        
        private OnOverlappedColumnChange(startCallback: Function, stopCallback: Function): void
        {
            //TODO: on_overlapped_column_change
        }
        
        private OnOverlappedRowChange(startCallback: Function, stopCallback: Function): void
        {
            //TODO: on_overlapped_row_change
        }
        
        private SetPlayer(column: number, row: number, isNoPlayer: boolean): void
        {
            if (!isNoPlayer)
            {
                this.RemoveFromGridMap(this._placeholderGrid);
            }
            
            var cell: ICoordsData = !isNoPlayer ? this._collidersData[0].PlayerCoords.Data : <ICoordsData>{ Column: column };
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
        
        private GetRowForGoPlayerUp(widget: IWidget): number
        {
            //TODO: can_go_player_up
            return 0;
        }
        
        private SetPlaceholder(column: number, row: number): void
        {
            //TODO: set_placeholder            
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
            //TODO: manage_movements
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
            
            if (this._options.IsAvoidOverlap && !this.IsCanMoveTo(widget, true))
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
            
            //NOTO: if (grid_data.el) - need check may be it works always!
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
                
        private MoveWidgetUp(el: JQuery): void
        {
            //NOTE: y_units was not used, GetNextRow/can_go_up_to_row returns number instead of boolean.
            var widget: IWidget = new Coords(el).Grid;
            var actualRow = widget.Row;
            var movedWidgets: JQuery[] = [];
            var isCanGoUp: boolean = true;
            
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
                    
                    nextWidgets.forEach($.proxy((w?, i?) => { this.MoveWidgetUp(w) }, this));
                }
            });            
        }
        
        private MoveWidgetDown(el: JQuery, yUnits: number): void
        {
            //TODO: move_widget_down
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
        
        private IsCanMoveTo(widget: IWidget, isNonSeeElement: boolean, maxRows?: number): boolean
        {
            var result: boolean = true;
            
            // Prevents widgets go out of the grid.
            if (((widget.Column + widget.SizeX - 1) > this._colsCount)
                || (maxRows && maxRows < (widget.Row + widget.SizeY - 1)))
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

        private OnResize(): void
        {
            //TODO: OnResize
        }
        
        private OnStopResize(event: JQueryEventObject, data: DraggableData): void
        {
            //TODO: OnStopResize
        }
        
        private OnStartResize(event: JQueryEventObject, data: DraggableData): void
        {
            this._resizedWidgetElements = data.Player.closest(".ws-w");
            
            var resizeCoords: Coords = new Coords(this._resizedWidgetElements);
            var resizeGrid: IWidget = resizeCoords.Grid;
            //TODO: OnStartResize
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