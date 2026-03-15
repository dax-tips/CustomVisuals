import { IGame } from "./IGame";

type GameFactory = () => IGame;

export class GameRegistry {
    private static factories: Map<string, GameFactory> = new Map();

    static register(id: string, factory: GameFactory): void {
        GameRegistry.factories.set(id, factory);
    }

    static create(id: string): IGame | null {
        const factory = GameRegistry.factories.get(id);
        return factory ? factory() : null;
    }

    static list(): { id: string; name: string; description: string }[] {
        const result: { id: string; name: string; description: string }[] = [];
        for (const [id, factory] of GameRegistry.factories) {
            const game = factory();
            result.push({ id, name: game.name, description: game.description });
            game.destroy();
        }
        return result;
    }

    static ids(): string[] {
        return Array.from(GameRegistry.factories.keys());
    }
}
