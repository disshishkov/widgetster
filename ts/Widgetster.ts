/// <reference path="definitions/jquery.d.ts" />
/// <reference path="IWidgetsterOptions.ts" />
/// <reference path="ICoordsData.ts" />
/// <reference path="ICollisionOptions.ts" />
/// <reference path="Coords.ts" />
/// <reference path="Utils.ts" />
/// <reference path="Collision.ts" />

module DS
{
    export class Widgetster
    {
        private _defaultOptions: IWidgetsterOptions =
        {
            Margins: null,
            BaseDimensions: null
        };

        private _el: JQuery;
        private _options: IWidgetsterOptions;

        constructor(el: JQuery, options: IWidgetsterOptions)
        {
            this._options = $.extend(true, {}, this._defaultOptions, options);
            console.log(this._options.BaseDimensions[1]);
            console.log(this._el);
            return this;
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