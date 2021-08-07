import {VoteAuthorizationSection} from './voteAuthorizationSection';
import {VotePartHashSign} from './votePartHashSign';
import {VotePartPerOrg} from './votePartPerOrg';

export class Vote {

    public Authorization: VoteAuthorizationSection;

    public ElectionId: string;

    public VoteRandomId: string;

    public VotePartCount: number;

    public VotePartsSignedHashes: VotePartHashSign[];

    public VotePartsPerOrg: VotePartPerOrg[];

    constructor(Authorization: VoteAuthorizationSection, ElectionId: string, VoteRandomId: string, VotePartCount: number, VotePartsSignedHashes: VotePartHashSign[], VotePartsPerOrg: VotePartPerOrg[]) {
        this.Authorization = Authorization;
        this.ElectionId = ElectionId;
        this.VoteRandomId = VoteRandomId;
        this.VotePartCount = VotePartCount;
        this.VotePartsSignedHashes = VotePartsSignedHashes;
        this.VotePartsPerOrg = VotePartsPerOrg;
    }
}
