module DS
{
    export interface ITouchEvents
    {
        touches: JQueryEventObject[];
        changedTouches: JQueryEventObject[];
    }
}

interface PopStateEvent extends DS.ITouchEvents
{
}