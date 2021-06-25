/*
  SPDX-License-Identifier: Apache-2.0
*/

import {Object, Property} from 'fabric-contract-api';

@Object()
export class Asset {
    @Property()
    public DocType: string;

    @Property()
    public ID: string;

    @Property()
    public Color: string;

    @Property()
    public Size: number;

    @Property()
    public Owner: string;

    @Property()
    public AppraisedValue: number;


    constructor(ID: string, Color: string, Size: number, Owner: string, AppraisedValue: number) {
        this.ID = ID;
        this.Color = Color;
        this.Size = Size;
        this.Owner = Owner;
        this.AppraisedValue = AppraisedValue;

        this.DocType = 'Asset';
    }
}
