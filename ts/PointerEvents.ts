module DS
{
    export class PointerEvents
    {
        constructor(start?:string, move?:string, end?:string)
        {
            this.Start = start;
            this.Move = move;
            this.End = end;
        }

        public Start: string;
        public Move: string;
        public End: string;
    }
}