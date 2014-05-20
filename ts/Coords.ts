/// <reference path="definitions/jquery.d.ts" />
/// <reference path="ICoordsData.ts" />

module DS
{
    export class Coords
    {
        public Data: ICoordsData = null;
        private _el: JQuery = null;

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
            el.data("WidgetsterCoords", this);
        }

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
        }

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
        }

        private Set(isUpdate: boolean, isNotUpdateOffsets: boolean): void
        {
            var el: JQuery = this._el;

            if (el)
            {
                var jqCoords: JQueryCoordinates = el.offset();

                if (!isUpdate)
                {
                    this.Data.Top = jqCoords.top;
                    this.Data.Left = jqCoords.left;
                    this.Data.Width = el.width();
                    this.Data.Height = el.height();
                }

                if (isUpdate && !isNotUpdateOffsets)
                {
                    this.Data.Top = jqCoords.top;
                    this.Data.Left = jqCoords.left;
                }
            }

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