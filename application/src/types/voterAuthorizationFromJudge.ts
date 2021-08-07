export class VoterAuthorizationFromJudge {
    public Org: string;
    public AuthorizationData: string;

    constructor(Org: string, AuthorizationData: string) {
        this.Org = Org;
        this.AuthorizationData = AuthorizationData;
    }
}
