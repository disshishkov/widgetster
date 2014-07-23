module DS
{
    /**
     * Detects collisions between a DOM element against other DOM elements or Coords objects.
     * 
     * @class Collision
     */ 
    export class Collision
    {
        private _defaultOptions: ICollisionOptions =
        {
            CollidersContext: document.body,
            OnOverlapStart: null,
            OnOverlapStop: null,
            OnOverlap: null
        };
        private _options: ICollisionOptions;
        private _el: JQuery;
        private _colliders: JQuery;
        private _lastCollidersCoords: Coords[] = [];
        private _isInContext: boolean = false;

        public Area: number;
        public AreaCoords: Coords;
        public Region: string;
        public Collider: JQuery;
        public ColliderCoords: Coords;
        public PlayerCoords: Coords;

        /**
         * Initialize the Collision object.
         * 
         * @param {JQuery} [el] The JQuery object.
         * @param {any} [colliders] Can be a jQuery collection of HTMLElements or an Array of Coords instances.
         * @param {ICollisionOptions} [options] An object of options (see ICollisionOptions).
         */ 
        constructor(el?: JQuery, colliders?: any, options?: ICollisionOptions)
        {
            //NOTE: follow colliders seems it should not be any
            if (!el && !colliders && !options)
            {
                return;
            }

            this._options = $.extend(this._defaultOptions, options);
            this._el = el;
            if (typeof colliders == "string" || colliders instanceof jQuery)
            {
                this._colliders = $(colliders, this._options.CollidersContext).not(this._el);
                this._isInContext = true;
            }
            else
            {
                this._colliders = $(colliders);
            }

            this.FindCollisions(null);
        }

        /**
         * Returns array of closest colliders.
         * 
         * @param {ICoordsData} [playerCoordsData] The ICoordsData object.
         * 
         * @return {Collision[]} Array of Collision instances.
         * 
         * @method GetClosestColliders.
         */ 
        public GetClosestColliders(playerCoordsData: ICoordsData): Collision[]
        {
            var colliders: Collision[] = this.FindCollisions(playerCoordsData);

            colliders.sort((a, b) =>
            {
                /* if colliders are being overlapped by the "C" (center) region,
                 * we have to set a lower index in the array to which they are placed
                 * above in the grid. */
                if (a.Region == "C" && b.Region == "C")
                {
                    return (a.ColliderCoords.Y1 < b.ColliderCoords.Y1 || a.ColliderCoords.X1 < b.ColliderCoords.X1) ? -1 : 1;
                }

                if (a.Area < b.Area)
                {
                    return 1;
                }

                return 1;
             });

            return colliders;
        }

        private FindCollisions(playerCoordsData: ICoordsData): Collision[]
        {
            var collidersCoords: Coords[] = [];
            var collidersData: Collision[] = [];
            var count: number = this._colliders.length;
            var playerCoords: Coords = new Coords(this._el);
            playerCoords.Update(playerCoordsData);

            while(count--)
            {
                //NOTE: decide use or not _isInContext
                var collider: JQuery = /*this._isInContext ? */$(this._colliders[count])/* : this._colliders[count]*/;
                var colliderCoords = new Coords(collider);

                if (!this.IsOverlaped(playerCoords, colliderCoords))
                {
                    continue;
                }

                var region: string = this.DetectOverlapingRegion(playerCoords, colliderCoords);
                if (region == "C")
                {
                    var areaCoords: Coords = this.CalculateOverlappedAreaCoords(playerCoords, colliderCoords);
                    var collision = new Collision();
                    collision.Area = (areaCoords.Width * areaCoords.Height);
                    collision.AreaCoords = areaCoords;
                    collision.Region = region;
                    collision.ColliderCoords = colliderCoords;
                    collision.PlayerCoords = playerCoords;
                    collision.Collider = collider;

                    if (this._options.OnOverlap)
                    {
                        this._options.OnOverlap.call(this, collision);
                    }

                    collidersCoords.push(colliderCoords);
                    collidersData.push(collision);
                }
            }

            if (this._options.OnOverlapStart)
            {
                this.OnCollidersStart(collidersCoords, this._options.OnOverlapStart);
            }

            if (this._options.OnOverlapStop)
            {
                this.OnCollidersStop(collidersCoords, this._options.OnOverlapStop);
            }

            this._lastCollidersCoords = collidersCoords;

            return collidersData;
        }

        private OnCollidersStart(newCoords: Coords[], callback: Function): void
        {
            for (var i = 0, length = this._lastCollidersCoords.length; i < length; i++)
            {
                var coords: Coords = this._lastCollidersCoords[i];
                if ($.inArray(coords, newCoords) === -1)
                {
                    callback.call(this, coords);
                }
            }
        }

        private OnCollidersStop(newCoords: Coords[], callback: Function): void
        {
            for (var i = 0, length = newCoords.length; i < length; i++)
            {
                var coords: Coords = newCoords[i];
                if ($.inArray(coords, this._lastCollidersCoords) === -1)
                {
                    callback.call(this, coords);
                }
            }
        }

        private CalculateOverlappedAreaCoords(a: Coords, b: Coords) : Coords
        {
            var x1: number = Math.max(a.X1, b.X1);
            var y1: number = Math.max(a.Y1, b.Y1);
            var x2: number = Math.min(a.X2, b.X2);
            var y2: number = Math.min(a.Y2, b.Y2);

            return new Coords($(
                {
                    Top: y1,
                    Left: x1,
                    Width: (x2 - x1),
                    Height: (y2 - y1)
                }));
        }

        private DetectOverlapingRegion(a: Coords, b: Coords): string
        {
            var regionX: string = "";
            var regionY: string = "";

            if (a.Y1 > b.CenterY && a.Y1 < b.Y2)
            {
                regionX = "N";
            }
            if (a.Y2 > b.Y1 && a.Y2 < b.CenterY)
            {
                regionX = "S";
            }
            if (a.X1 > b.CenterX && a.X1 < b.X2)
            {
                regionY = "W";
            }
            if (a.X2 > b.X1 && a.X2 < b.CenterX)
            {
                regionY = "E";
            }

            return (regionX + regionY) || "C";
        }

        private IsOverlaped(a: Coords, b: Coords): boolean
        {
            var x = false;
            var y = false;

            if ((b.X1 >= a.X1 && b.X1 <= a.X2)
                || (b.X2 >= a.X1 && b.X2 <= a.X2)
                || (a.X1 >= b.X1 && a.X2 < b.X2))
            {
                x = true;
            }

            if ((b.Y1 >= a.Y1 && b.Y1 <= a.Y2)
                || (b.Y2 >= a.Y1 && b.Y2 <= a.Y2)
                || (a.Y1 >= b.Y1 && a.Y2 < b.Y2))
            {
                y = true;
            }

            return (x && y);
        }
    }
}
