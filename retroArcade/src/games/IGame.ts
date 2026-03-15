export interface IGame {
    readonly name: string;
    readonly description: string;
    init(container: HTMLElement): void;
    start(): void;
    stop(): void;
    resize(width: number, height: number): void;
    destroy(): void;
}
