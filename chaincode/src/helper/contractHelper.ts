import {Context} from "fabric-contract-api";

export function decodeBase64(s: string) {
    const buffer = new Buffer(s, 'base64');
    return buffer.toString('utf8');
}

export function extractSubmittingUserOrg(ctx: Context) {
    return ctx.clientIdentity.getMSPID();
}

export function extractSubmittingUserUID(ctx: Context) {
    let userId = ctx.clientIdentity.getID();
    let mspId = ctx.clientIdentity.getMSPID();

    return `${userId}@${mspId}`;
}
