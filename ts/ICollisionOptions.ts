module DS
{
    export interface ICollisionOptions
    {
        CollidersContext: HTMLElement;
        OnOverlapStart: Function;
        OnOverlapStop: Function;
        OnOverlap: Function;
    }
}
