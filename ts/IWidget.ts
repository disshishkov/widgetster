module DS
{
    export interface IWidget
    {
        Column: number;
        Row: number;
        SizeX: number;
        SizeY: number;
        MaxSizeX: number;
        MaxSizeY: number;
        MinSizeX: number;
        MinSizeY: number;
        Element: JQuery;
    }
}