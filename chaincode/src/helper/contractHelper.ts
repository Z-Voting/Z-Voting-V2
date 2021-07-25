import {Context} from 'fabric-contract-api';

export function decodeBase64(s: string) {
    const buffer = new Buffer(s, 'base64');
    return buffer.toString('utf8');
}

export function getSubmittingUserOrg(ctx: Context) {
    return ctx.clientIdentity.getMSPID();
}

export function getSubmittingUserUID(ctx: Context) {
    const userId = ctx.clientIdentity.getID();
    const mspId = ctx.clientIdentity.getMSPID();

    return `${userId}@${mspId}`;
}

export function getImplicitPrivateCollection(ctx: Context, org?: string) {
    if (org === undefined) {
        return '_implicit_org_' + ctx.stub.getMspID();
    } else {
        return '_implicit_org_' + org;
    }
}
