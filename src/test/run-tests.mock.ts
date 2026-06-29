import {assert, check} from '@augment-vir/assert';
import {
    omitObjectKeys,
    type PartialWithNullable,
    removeColor,
    removeNullishValues,
} from '@augment-vir/common';
import {it} from '@augment-vir/test';
import {format as prettierFormat, type Options as PrettierOptions} from 'prettier';
import {type MultilineArrayOptions} from '../options.js';
import {repoConfig} from './prettier-config.js';

async function runPrettierFormat({
    code,
    extension,
    options = {},
    parser,
}: Readonly<{
    code: string;
    extension: string;
    options?: (Partial<MultilineArrayOptions> & PartialWithNullable<PrettierOptions>) | undefined;
    parser: string | undefined;
}>): Promise<string> {
    if (extension.startsWith('.')) {
        extension = extension.slice(1);
    }

    const filepathOptions: Partial<Pick<PrettierOptions, 'filepath'>> = check.isString(
        options.filepath,
    )
        ? {
              filepath: options.filepath,
          }
        : 'filepath' in options
        ? {}
        : {
              filepath: `blah.${extension}`,
          };

    const prettierOptions: PrettierOptions = {
        ...repoConfig,
        ...removeNullishValues(
            omitObjectKeys(options, [
                'filepath',
            ]),
        ),
        ...filepathOptions,
        ...(parser
            ? {
                  parser,
              }
            : {}),
    };

    return await prettierFormat(code, prettierOptions);
}

export type MultilineArrayTest = {
    it: string;
    code: string;
    expect?: string | undefined;
    options?: (Partial<MultilineArrayOptions> & PartialWithNullable<PrettierOptions>) | undefined;
    only?: true;
    skip?: true;
    failureMessage?: string;
};

let forced = false;

let allPassed = true;

function removeIndent(input: string): string {
    return (
        input
            .replace(/^\s*\n\s*/, '')
            .replace(/\n {12}/g, '\n')
            // this is only used for tests

            .replace(/\n[ \t]+$/, '\n')
    );
}

export function runTests({
    extension,
    tests,
    parser,
}: Readonly<{extension: string; tests: MultilineArrayTest[]; parser: string}>) {
    tests.forEach((test) => {
        async function testCallback() {
            try {
                const inputCode = removeIndent(test.code);
                const expected = removeIndent(test.expect ?? test.code);
                const formatted = await runPrettierFormat({
                    code: inputCode,
                    extension,
                    options: test.options,
                    parser,
                });
                assert.strictEquals(formatted, expected);
                if (formatted !== expected) {
                    allPassed = false;
                }
            } catch (error) {
                allPassed = false;
                if (test.failureMessage && error instanceof Error) {
                    const strippedMessage = removeColor(error.message);
                    if (test.failureMessage !== strippedMessage) {
                        console.info({
                            strippedMessage,
                        });
                    }
                    assert.strictEquals(removeColor(strippedMessage), test.failureMessage);
                } else {
                    throw error;
                }
            }
        }

        if (test.only) {
            forced = true;
            // eslint-disable-next-line sonarjs/no-exclusive-tests
            it.only(test.it, testCallback);
        } else if (test.skip) {
            it.skip(test.it, testCallback);
        } else {
            it(test.it, testCallback);
        }
    });

    if (forced) {
        // eslint-disable-next-line sonarjs/no-exclusive-tests
        it.only('forced tests should not remain in the code', () => {
            if (allPassed) {
                assert.strictEquals(forced, false, 'Only tests are not allowed.');
            }
        });
    }
}
