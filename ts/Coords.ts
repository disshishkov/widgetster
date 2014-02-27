/// <reference path="definitions/jquery.d.ts" />
/// <reference path="ICoordsData.ts" />

module DS
{
    export class Coords
    {
        private _data: ICoordsData = null;
        private _el: JQuery = null;

        public IsCoords: boolean = false;

        public X1: number;
        public Y1: number;
        public X2: number;
        public Y2: number;
        public CenterX: number;
        public CenterY: number;
        public Width: number;
        public Height: number;

        constructor(el: JQuery)
        {
            if (el.data("WidgetsterCoords"))
            {
                return el.data("WidgetsterCoords");
            }

            this.Init(el);
            el.data("WidgetsterCoords", this);

            return this;
        }

        public Update(data: ICoordsData): void
        {
            if (!data && !this._el)
            {
                return;
            }

            if (data)
            {
                var newData = $.extend({}, this._data, data);
                this._data = newData;
                this.Set(true, true);
            }
            else
            {
                this.Set(true, false);
            }
        }

        private Init(el: JQuery): void
        {
            if (el[0] && $.isPlainObject(el[0]))
            {
                this._data = el[0];
            }
            else
            {
                this._el = el;
            }

            this.IsCoords = true;
            this.Set(false, false);
        }

        private Set(isUpdate: boolean, isNotUpdateOffsets: boolean): void
        {
            var el: JQuery = this._el;

            if (el)
            {
                var jqCoords: JQueryCoordinates = el.offset();

                if (!isUpdate)
                {
                    this._data.Top = jqCoords.top;
                    this._data.Left = jqCoords.left;
                    this._data.Width = el.width();
                    this._data.Height = el.height();
                }

                if (isUpdate && !isNotUpdateOffsets)
                {
                    this._data.Top = jqCoords.top;
                    this._data.Left = jqCoords.left;
                }
            }

            this.X1 = this._data.Left;
            this.Y1 = this._data.Top;
            this.X2 = this._data.Left + this._data.Width;
            this.Y2 = this._data.Top + this._data.Height;
            this.CenterX = this._data.Left + (this._data.Width / 2);
            this.CenterY = this._data.Top + (this._data.Height / 2);
            this.Width = this._data.Width;
            this.Height = this._data.Height;
            //TODO: ?? this.coords.el  = el || false ;
        }
    }
}  