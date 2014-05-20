module DS
{
    export interface ICoordsData
    {
        Top: number;
        Left: number;
        Width: number;
        Height: number;
        Row: number;
        Column: number;
    }
}

interface HTMLElement extends DS.ICoordsData
{
}