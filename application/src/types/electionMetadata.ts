import {JudgeProposal} from './judgeProposal';
import {OrgVotePartList} from './orgVotePartList';

export class ElectionMetadata {

    public Judges?: JudgeProposal[];

    public JudgesPerVotePart?: string[][];

    public VotePartsPerJudge?: OrgVotePartList[];

    public JudgeCount?: number;

    public TrustThreshold?: number;

    public VotePartCount?: number;

    public VotePartCopies?: number;

    public N?: number;
}
