/// <reference path="definitions/jquery.d.ts" />
/// <reference path="ICoordsData.ts" />

module DS
{
    /**
     * Represent object with coordinates to simulate DOM elements on the screen.
     * 
     * @class Coords
     */ 
    export class Coords
    {
        private _el: JQuery = null;
        
        public Data: ICoordsData = <ICoordsData>{};        
        public Grid: IWidget;
        
        public X1: number;
        public Y1: number;
        public X2: number;
        public Y2: number;
        public CenterX: number;
        public CenterY: number;
        public Width: number;
        public Height: number;

        /**
         * Initialize the Coords object.
         * 
         * @param {JQuery} [el] The JQuery object. Can be as element and object with data (see ICoordsData).
         * @param {IWidget} [grid] The grid of current element (see IWidget).
         */ 
        constructor(el: JQuery, grid?: IWidget)
        {
            if (el.data("WidgetsterCoords"))
            {
                this.Fill(el.data("WidgetsterCoords"));
            }

            if (el[0] && $.isPlainObject(el[0]))
            {
                this.Data = el[0];
            }
            else
            {
                this._el = el;
            }

            this.Set(false, false);
            
            if (grid)
            {
                this.Grid = grid;
            }
            
            el.data("WidgetsterCoords", this);
        }
        
        public static UpdateGrid(el: JQuery, widget: IWidget): void
        {
            if (el.data("WidgetsterCoords"))
            {
                var coords: Coords = el.data("WidgetsterCoords");
                coords.Grid = $.extend({}, coords.Grid, widget);
                el.data("WidgetsterCoords", coords);
            }
        }

        /**
         * Updates data.
         * 
         * @param {ICoordsData} [data] The ICoordsData object.
         * 
         * @method Update.
         */ 
        public Update(data: ICoordsData): void
        {
            if (!data && !this._el)
            {
                return;
            }

            if (data)
            {
                this.Data = $.extend({}, this.Data, data);
                this.Set(true, true);
            }
            else
            {
                this.Set(true, false);
            }
            
            if (this._el)
            {
                this._el.data("WidgetsterCoords", this);
            }
        }

        /**
         * Fills current instance state from another  object.
         * 
         * @param {Coords} [coords] The Coords object.
         * 
         * @method Fill.
         */ 
        private Fill(coords: Coords): void
        {
            this.Data = coords.Data;
            this._el = coords._el;

            this.X1 = coords.X1;
            this.Y1 = coords.Y1;
            this.X2 = coords.X2;
            this.Y2 = coords.Y2;
            this.CenterX = coords.CenterX;
            this.CenterY = coords.CenterY;
            this.Width = coords.Width;
            this.Height = coords.Height;
            this.Grid = coords.Grid;
        }

        /**
         * Sets properties for instance.
         * 
         * @param {boolean} [isUpdate] Indicate when need to update data.
         * @param {boolean} [isNotUpdateOffsets] Indicate when not need to update offsets.
         * 
         * @method Set.
         */ 
        private Set(isUpdate: boolean, isNotUpdateOffsets: boolean): void
        {
            if (this._el)
            {
                var jqCoords: JQueryCoordinates = this._el.offset();

                if (!isUpdate)
                {
                    this.Data.Top = jqCoords.top;
                    this.Data.Left = jqCoords.left;
                    this.Data.Width = this._el.width();
                    this.Data.Height = this._el.height();
                }

                if (isUpdate && !isNotUpdateOffsets)
                {
                    this.Data.Top = jqCoords.top;
                    this.Data.Left = jqCoords.left;
                }
            }
            
            typeof this.Data.Left === "undefined" && (this.Data.Left = this.X1);
            typeof this.Data.Top === "undefined" && (this.Data.Top = this.Y1);

            this.X1 = this.Data.Left;
            this.Y1 = this.Data.Top;
            this.X2 = this.Data.Left + this.Data.Width;
            this.Y2 = this.Data.Top + this.Data.Height;
            this.CenterX = this.Data.Left + (this.Data.Width / 2);
            this.CenterY = this.Data.Top + (this.Data.Height / 2);
            this.Width = this.Data.Width;
            this.Height = this.Data.Height;
        }
    }
}  