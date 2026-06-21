// ============================================================================
// SOMA VENDORED OVERRIDE of Pi's core/tools/edit-diff.js
// Fork base: @earendil-works/pi-coding-agent 0.79.6 (see edit-diff.pristine.js).
// Applied at build time by apply-patches.sh (drift-guarded: build FAILS LOUD if the
// upstream file no longer matches edit-diff.pristine.js -> re-fork before shipping).
//
// SOMA changes vs pristine (s01-4409c8):
//   #1 near-match hint   - getNotFoundError appends the ACTUAL nearby bytes from the file
//                          (token-overlap located) so the model copies them instead of
//                          re-reconstructing oldText from memory (the #1 "Could not find" cause).
//   #4 surgical fuzzy    - fuzzy matching no longer normalizes the WHOLE file. Pristine
//                          replaced in normalized space (normalizeForFuzzyMatch(content)),
//                          silently flattening every em-dash/smart-quote/NBSP/trailing-ws in
//                          the file on ANY fuzzy edit. We map the fuzzy match back to a byte
//                          span in the ORIGINAL content and splice only that span, preserving
//                          all untouched bytes. Verified by re-normalizing the chosen span; a
//                          non-round-tripping match falls through to "not found" + hint rather
//                          than a wrong/destructive write.
// ============================================================================
/**
 * Shared diff computation utilities for the edit tool.
 * Used by both edit.ts (for execution) and tool-execution.ts (for preview rendering).
 */
import * as Diff from "diff";
import { constants } from "fs";
import { access, readFile } from "fs/promises";
import { resolveToCwd } from "./path-utils.js";
export function detectLineEnding(content) {
    const crlfIdx = content.indexOf("\r\n");
    const lfIdx = content.indexOf("\n");
    if (lfIdx === -1)
        return "\n";
    if (crlfIdx === -1)
        return "\n";
    return crlfIdx < lfIdx ? "\r\n" : "\n";
}
export function normalizeToLF(text) {
    return text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
}
export function restoreLineEndings(text, ending) {
    return ending === "\r\n" ? text.replace(/\n/g, "\r\n") : text;
}
/**
 * Normalize text for fuzzy matching. Applies progressive transformations:
 * - Strip trailing whitespace from each line
 * - Normalize smart quotes to ASCII equivalents
 * - Normalize Unicode dashes/hyphens to ASCII hyphen
 * - Normalize special Unicode spaces to regular space
 */
export function normalizeForFuzzyMatch(text) {
    return (text
        .normalize("NFKC")
        // Strip trailing whitespace per line
        .split("\n")
        .map((line) => line.trimEnd())
        .join("\n")
        // Smart single quotes → '
        .replace(/[\u2018\u2019\u201A\u201B]/g, "'")
        // Smart double quotes → "
        .replace(/[\u201C\u201D\u201E\u201F]/g, '"')
        // Various dashes/hyphens → -
        // U+2010 hyphen, U+2011 non-breaking hyphen, U+2012 figure dash,
        // U+2013 en-dash, U+2014 em-dash, U+2015 horizontal bar, U+2212 minus
        .replace(/[\u2010\u2011\u2012\u2013\u2014\u2015\u2212]/g, "-")
        // Special spaces → regular space
        // U+00A0 NBSP, U+2002-U+200A various spaces, U+202F narrow NBSP,
        // U+205F medium math space, U+3000 ideographic space
        .replace(/[\u00A0\u2002-\u200A\u202F\u205F\u3000]/g, " "));
}
/**
 * Find oldText in content, trying exact match first, then fuzzy match.
 * When fuzzy matching is used, the returned contentForReplacement is the
 * fuzzy-normalized version of the content (trailing whitespace stripped,
 * Unicode quotes/dashes normalized to ASCII).
 */
export function fuzzyFindText(content, oldText) {
    // Try exact match first
    const exactIndex = content.indexOf(oldText);
    if (exactIndex !== -1) {
        return {
            found: true,
            index: exactIndex,
            matchLength: oldText.length,
            usedFuzzyMatch: false,
            contentForReplacement: content,
        };
    }
    // Try fuzzy match - work entirely in normalized space
    const fuzzyContent = normalizeForFuzzyMatch(content);
    const fuzzyOldText = normalizeForFuzzyMatch(oldText);
    const fuzzyIndex = fuzzyContent.indexOf(fuzzyOldText);
    if (fuzzyIndex === -1) {
        return {
            found: false,
            index: -1,
            matchLength: 0,
            usedFuzzyMatch: false,
            contentForReplacement: content,
        };
    }
    // When fuzzy matching, we work in the normalized space for replacement.
    // This means the output will have normalized whitespace/quotes/dashes,
    // which is acceptable since we're fixing minor formatting differences anyway.
    return {
        found: true,
        index: fuzzyIndex,
        matchLength: fuzzyOldText.length,
        usedFuzzyMatch: true,
        contentForReplacement: fuzzyContent,
    };
}
/** Strip UTF-8 BOM if present, return both the BOM (if any) and the text without it */
export function stripBom(content) {
    return content.startsWith("\uFEFF") ? { bom: "\uFEFF", text: content.slice(1) } : { bom: "", text: content };
}
function countOccurrences(content, oldText) {
    const fuzzyContent = normalizeForFuzzyMatch(content);
    const fuzzyOldText = normalizeForFuzzyMatch(oldText);
    return fuzzyContent.split(fuzzyOldText).length - 1;
}
function getNotFoundError(path, editIndex, totalEdits, content, oldText) {
    const base = totalEdits === 1
        ? `Could not find the exact text in ${path}. The old text must match exactly including all whitespace and newlines.`
        : `Could not find edits[${editIndex}] in ${path}. The oldText must match exactly including all whitespace and newlines.`;
    // SOMA PATCH #1 (s01-4409c8): hand the model the actual nearby bytes to copy.
    const hint = content !== undefined && oldText !== undefined ? findClosestHint(content, oldText) : "";
    return new Error(base + hint);
}
// SOMA PATCH #1 (s01-4409c8): locate the closest region (token overlap, typo-tolerant) and
// show its exact bytes, so the model copies them instead of reconstructing oldText from memory.
function findClosestHint(content, oldText) {
    try {
        const contentLines = content.split("\n");
        const normLines = contentLines.map((l) => normalizeForFuzzyMatch(l).toLowerCase());
        const tokens = Array.from(new Set(normalizeForFuzzyMatch(oldText).toLowerCase().match(/[a-z0-9]{3,}/g) || []));
        if (tokens.length === 0)
            return "";
        let bestLine = -1;
        let bestScore = 0;
        for (let i = 0; i < normLines.length; i++) {
            let score = 0;
            for (const t of tokens)
                if (normLines[i].includes(t))
                    score++;
            if (score > bestScore) {
                bestScore = score;
                bestLine = i;
            }
        }
        const need = Math.min(Math.max(2, Math.ceil(tokens.length / 2)), tokens.length);
        if (bestLine < 0 || bestScore < need)
            return "";
        const start = Math.max(0, bestLine - 2);
        const end = Math.min(contentLines.length, bestLine + 3);
        const region = contentLines
            .slice(start, end)
            .map((l, k) => `${start + k + 1}: ${l}`)
            .join("\n");
        const capped = region.length > 1200 ? region.slice(0, 1200) + "\n...(truncated)" : region;
        return `\n\nClosest match is near line ${bestLine + 1}. Copy these EXACT bytes (do not reconstruct from memory):\n${capped}`;
    }
    catch {
        // best-effort hint; never let it mask the real error
    }
    return "";
}
// SOMA PATCH #4 (s01-4409c8): map one char through the same swaps normalizeForFuzzyMatch
// applies (quotes/dashes/special-spaces -> ASCII). Length-preserving.
function swapFuzzyChar(ch) {
    if ("\u2018\u2019\u201A\u201B".indexOf(ch) !== -1)
        return "'";
    if ("\u201C\u201D\u201E\u201F".indexOf(ch) !== -1)
        return '"';
    if ("\u2010\u2011\u2012\u2013\u2014\u2015\u2212".indexOf(ch) !== -1)
        return "-";
    if (ch === "\u00A0" || ch === "\u202F" || ch === "\u205F" || ch === "\u3000" ||
        (ch >= "\u2002" && ch <= "\u200A"))
        return " ";
    return ch;
}
// SOMA PATCH #4 (s01-4409c8): build the fuzzy-normalized string of `content` PLUS a position
// map back to ORIGINAL byte offsets. Replicates normalizeForFuzzyMatch's per-line trimEnd +
// char swaps (NFKC treated as identity for mapping; the caller re-normalizes the chosen span
// and rejects any non-round-tripping match, so NFKC-altering content falls through to
// "not found" + hint instead of corrupting). map[i] = original index of norm char i.
function buildFuzzyMap(content) {
    const out = [];
    const map = [];
    const lines = content.split("\n");
    let pos = 0;
    for (let li = 0; li < lines.length; li++) {
        const line = lines[li];
        const trimmed = line.trimEnd();
        for (let ci = 0; ci < trimmed.length; ci++) {
            out.push(swapFuzzyChar(line[ci]));
            map.push(pos + ci);
        }
        if (li < lines.length - 1) {
            out.push("\n");
            map.push(pos + line.length);
            pos += line.length + 1;
        }
        else {
            pos += line.length;
        }
    }
    map.push(content.length);
    return { norm: out.join(""), map };
}
// SOMA PATCH #4 (s01-4409c8): find [start,end) in ORIGINAL content for oldText. Exact wins
// (byte-perfect, unambiguous). Else fuzzy: locate in normalized space, map back to original
// bytes, VERIFY the span re-normalizes to the target. Returns occurrences for uniqueness.
function findEditSpan(content, oldText) {
    const exactIndex = content.indexOf(oldText);
    if (exactIndex !== -1) {
        let occ = 0;
        let from = 0;
        let p;
        while ((p = content.indexOf(oldText, from)) !== -1) {
            occ++;
            from = p + Math.max(1, oldText.length);
        }
        return { found: true, start: exactIndex, end: exactIndex + oldText.length, occurrences: occ };
    }
    const fuzzyOld = normalizeForFuzzyMatch(oldText);
    if (fuzzyOld.length === 0)
        return { found: false, start: 0, end: 0, occurrences: 0 };
    const { norm, map } = buildFuzzyMap(content);
    const occ = norm.split(fuzzyOld).length - 1;
    if (occ === 0)
        return { found: false, start: 0, end: 0, occurrences: 0 };
    const fuzzyIndex = norm.indexOf(fuzzyOld);
    const start = map[fuzzyIndex];
    const end = map[fuzzyIndex + fuzzyOld.length];
    if (start === undefined || end === undefined ||
        normalizeForFuzzyMatch(content.slice(start, end)) !== fuzzyOld) {
        return { found: false, start: 0, end: 0, occurrences: 0 };
    }
    return { found: true, start, end, occurrences: occ };
}
function getDuplicateError(path, editIndex, totalEdits, occurrences) {
    if (totalEdits === 1) {
        return new Error(`Found ${occurrences} occurrences of the text in ${path}. The text must be unique. Please provide more context to make it unique.`);
    }
    return new Error(`Found ${occurrences} occurrences of edits[${editIndex}] in ${path}. Each oldText must be unique. Please provide more context to make it unique.`);
}
function getEmptyOldTextError(path, editIndex, totalEdits) {
    if (totalEdits === 1) {
        return new Error(`oldText must not be empty in ${path}.`);
    }
    return new Error(`edits[${editIndex}].oldText must not be empty in ${path}.`);
}
function getNoChangeError(path, totalEdits) {
    if (totalEdits === 1) {
        return new Error(`No changes made to ${path}. The replacement produced identical content. This might indicate an issue with special characters or the text not existing as expected.`);
    }
    return new Error(`No changes made to ${path}. The replacements produced identical content.`);
}
/**
 * Apply one or more exact-text replacements to LF-normalized content.
 *
 * SOMA PATCH #4 (s01-4409c8): all matching + replacement happens in ORIGINAL content space.
 * Each edit's oldText is located (exact, else surgical-fuzzy via findEditSpan) and only its
 * matched byte span is spliced. Unlike pristine Pi, a fuzzy match NEVER normalizes the rest
 * of the file, so untouched em-dashes / smart quotes / NBSP / trailing whitespace are
 * byte-preserved. Replacements apply in reverse offset order so earlier offsets stay valid.
 */
export function applyEditsToNormalizedContent(normalizedContent, edits, path) {
    const normalizedEdits = edits.map((edit) => ({
        oldText: normalizeToLF(edit.oldText),
        newText: normalizeToLF(edit.newText),
    }));
    for (let i = 0; i < normalizedEdits.length; i++) {
        if (normalizedEdits[i].oldText.length === 0) {
            throw getEmptyOldTextError(path, i, normalizedEdits.length);
        }
    }
    const baseContent = normalizedContent;
    const matchedEdits = [];
    for (let i = 0; i < normalizedEdits.length; i++) {
        const edit = normalizedEdits[i];
        const span = findEditSpan(baseContent, edit.oldText);
        if (!span.found) {
            throw getNotFoundError(path, i, normalizedEdits.length, baseContent, edit.oldText);
        }
        if (span.occurrences > 1) {
            throw getDuplicateError(path, i, normalizedEdits.length, span.occurrences);
        }
        matchedEdits.push({
            editIndex: i,
            matchIndex: span.start,
            matchLength: span.end - span.start,
            newText: edit.newText,
        });
    }
    matchedEdits.sort((a, b) => a.matchIndex - b.matchIndex);
    for (let i = 1; i < matchedEdits.length; i++) {
        const previous = matchedEdits[i - 1];
        const current = matchedEdits[i];
        if (previous.matchIndex + previous.matchLength > current.matchIndex) {
            throw new Error(`edits[${previous.editIndex}] and edits[${current.editIndex}] overlap in ${path}. Merge them into one edit or target disjoint regions.`);
        }
    }
    let newContent = baseContent;
    for (let i = matchedEdits.length - 1; i >= 0; i--) {
        const edit = matchedEdits[i];
        newContent =
            newContent.substring(0, edit.matchIndex) +
                edit.newText +
                newContent.substring(edit.matchIndex + edit.matchLength);
    }
    if (baseContent === newContent) {
        throw getNoChangeError(path, normalizedEdits.length);
    }
    return { baseContent, newContent };
}
/** Generate a standard unified patch. */
export function generateUnifiedPatch(path, oldContent, newContent, contextLines = 4) {
    return Diff.createTwoFilesPatch(path, path, oldContent, newContent, undefined, undefined, {
        context: contextLines,
        headerOptions: Diff.FILE_HEADERS_ONLY,
    });
}
/**
 * Generate a display-oriented diff string with line numbers and context.
 * Returns both the diff string and the first changed line number (in the new file).
 */
export function generateDiffString(oldContent, newContent, contextLines = 4) {
    const parts = Diff.diffLines(oldContent, newContent);
    const output = [];
    const oldLines = oldContent.split("\n");
    const newLines = newContent.split("\n");
    const maxLineNum = Math.max(oldLines.length, newLines.length);
    const lineNumWidth = String(maxLineNum).length;
    let oldLineNum = 1;
    let newLineNum = 1;
    let lastWasChange = false;
    let firstChangedLine;
    for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        const raw = part.value.split("\n");
        if (raw[raw.length - 1] === "") {
            raw.pop();
        }
        if (part.added || part.removed) {
            // Capture the first changed line (in the new file)
            if (firstChangedLine === undefined) {
                firstChangedLine = newLineNum;
            }
            // Show the change
            for (const line of raw) {
                if (part.added) {
                    const lineNum = String(newLineNum).padStart(lineNumWidth, " ");
                    output.push(`+${lineNum} ${line}`);
                    newLineNum++;
                }
                else {
                    // removed
                    const lineNum = String(oldLineNum).padStart(lineNumWidth, " ");
                    output.push(`-${lineNum} ${line}`);
                    oldLineNum++;
                }
            }
            lastWasChange = true;
        }
        else {
            // Context lines - only show a few before/after changes
            const nextPartIsChange = i < parts.length - 1 && (parts[i + 1].added || parts[i + 1].removed);
            const hasLeadingChange = lastWasChange;
            const hasTrailingChange = nextPartIsChange;
            if (hasLeadingChange && hasTrailingChange) {
                if (raw.length <= contextLines * 2) {
                    for (const line of raw) {
                        const lineNum = String(oldLineNum).padStart(lineNumWidth, " ");
                        output.push(` ${lineNum} ${line}`);
                        oldLineNum++;
                        newLineNum++;
                    }
                }
                else {
                    const leadingLines = raw.slice(0, contextLines);
                    const trailingLines = raw.slice(raw.length - contextLines);
                    const skippedLines = raw.length - leadingLines.length - trailingLines.length;
                    for (const line of leadingLines) {
                        const lineNum = String(oldLineNum).padStart(lineNumWidth, " ");
                        output.push(` ${lineNum} ${line}`);
                        oldLineNum++;
                        newLineNum++;
                    }
                    output.push(` ${"".padStart(lineNumWidth, " ")} ...`);
                    oldLineNum += skippedLines;
                    newLineNum += skippedLines;
                    for (const line of trailingLines) {
                        const lineNum = String(oldLineNum).padStart(lineNumWidth, " ");
                        output.push(` ${lineNum} ${line}`);
                        oldLineNum++;
                        newLineNum++;
                    }
                }
            }
            else if (hasLeadingChange) {
                const shownLines = raw.slice(0, contextLines);
                const skippedLines = raw.length - shownLines.length;
                for (const line of shownLines) {
                    const lineNum = String(oldLineNum).padStart(lineNumWidth, " ");
                    output.push(` ${lineNum} ${line}`);
                    oldLineNum++;
                    newLineNum++;
                }
                if (skippedLines > 0) {
                    output.push(` ${"".padStart(lineNumWidth, " ")} ...`);
                    oldLineNum += skippedLines;
                    newLineNum += skippedLines;
                }
            }
            else if (hasTrailingChange) {
                const skippedLines = Math.max(0, raw.length - contextLines);
                if (skippedLines > 0) {
                    output.push(` ${"".padStart(lineNumWidth, " ")} ...`);
                    oldLineNum += skippedLines;
                    newLineNum += skippedLines;
                }
                for (const line of raw.slice(skippedLines)) {
                    const lineNum = String(oldLineNum).padStart(lineNumWidth, " ");
                    output.push(` ${lineNum} ${line}`);
                    oldLineNum++;
                    newLineNum++;
                }
            }
            else {
                // Skip these context lines entirely
                oldLineNum += raw.length;
                newLineNum += raw.length;
            }
            lastWasChange = false;
        }
    }
    return { diff: output.join("\n"), firstChangedLine };
}
/**
 * Compute the diff for one or more edit operations without applying them.
 * Used for preview rendering in the TUI before the tool executes.
 */
export async function computeEditsDiff(path, edits, cwd) {
    const absolutePath = resolveToCwd(path, cwd);
    try {
        // Check if file exists and is readable
        try {
            await access(absolutePath, constants.R_OK);
        }
        catch (error) {
            const errorMessage = error instanceof Error && "code" in error ? `Error code: ${error.code}` : String(error);
            return { error: `Could not edit file: ${path}. ${errorMessage}.` };
        }
        // Read the file
        const rawContent = await readFile(absolutePath, "utf-8");
        // Strip BOM before matching (LLM won't include invisible BOM in oldText)
        const { text: content } = stripBom(rawContent);
        const normalizedContent = normalizeToLF(content);
        const { baseContent, newContent } = applyEditsToNormalizedContent(normalizedContent, edits, path);
        // Generate the diff
        return generateDiffString(baseContent, newContent);
    }
    catch (err) {
        return { error: err instanceof Error ? err.message : String(err) };
    }
}
/**
 * Compute the diff for a single edit operation without applying it.
 * Kept as a convenience wrapper for single-edit callers.
 */
export async function computeEditDiff(path, oldText, newText, cwd) {
    return computeEditsDiff(path, [{ oldText, newText }], cwd);
}
//# sourceMappingURL=edit-diff.js.map