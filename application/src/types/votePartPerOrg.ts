import {EncryptedVotePartEntry} from './encryptedVotePartEntry';

export class VotePartPerOrg {
    public Org: string;
    public EncryptedVoteParts: EncryptedVotePartEntry[];

    constructor(Org: string) {
        this.Org = Org;
        this.EncryptedVoteParts = [];
    }
}
