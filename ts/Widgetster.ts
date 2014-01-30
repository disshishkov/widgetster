/// <reference path="definitions/jquery.d.ts" />
/// <reference path="IWidgetsterOptions.ts"/>

module DS
{
    export class Widgetster
    {
        constructor
            (
                private _el: JQuery,
                private _options: IWidgetsterOptions
            )
        {
            console.log(this._options.BaseDimensions[1]);
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