module DS
{
    export interface ICoordsData
    {
        Top: number;
        Left: number;
        Width: number;
        Height: number;
    }
}

interface HTMLElement extends DS.ICoordsData
{
}