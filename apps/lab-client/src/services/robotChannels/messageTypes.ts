import { z } from "zod";

export enum MType {
    RobotsAvailable = 'robotsAvailable',
}

export const BaseDataChannelMessageSchema = z.object({
    messageType: z.nativeEnum(MType),
});
export type BaseDataChannelMessage = z.infer<typeof BaseDataChannelMessageSchema>;


export const robotsAvailableMessageSchema = BaseDataChannelMessageSchema.extend({
    robotIds: z.array(z.string()),
});
export type RobotsAvailableMessage = z.infer<typeof robotsAvailableMessageSchema>;
