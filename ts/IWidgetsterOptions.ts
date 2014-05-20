module DS
{
    export interface IWidgetsterOptions
    {
        Namespace: string;
        Selector: string;
        Margins: number[];
        BaseDimensions: number[];
        ExtraRows: number;
        ExtraCols: number;
        MinCols: number;
        MaxCols: number;
        MinRows: number;
        MaxSizeX: number;
        IsAvoidOverlap: boolean;
        SerializeParams: Function;
        Collision: ICollisionOptions;
        Draggable: IDraggableOptions;
        Resize: IResizeOptions;
    }
} 