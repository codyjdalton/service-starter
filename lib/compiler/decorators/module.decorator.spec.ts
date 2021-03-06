import { expect } from 'chai';

import { Injector } from 'super-injector';
import { LitModule } from '../..';

describe('ModuleDecorator', () => {

    it('should allow passing exports to modules', () => {

        @LitModule({
            exports: []
        })
        class TestModule {

        }

        expect(Injector.get(TestModule, 'exports')).to.not.be.undefined;
    });

    it('should allow empty module arguments', () => {
        @LitModule()
        class TestModule {

        }

        expect(Injector.get(TestModule, 'path').toString()).to.equal('');
        expect(Injector.get(TestModule, 'exports').toString()).to.equal([].toString());
        expect(Injector.get(TestModule, 'imports').toString()).to.equal([].toString());
    });
});
