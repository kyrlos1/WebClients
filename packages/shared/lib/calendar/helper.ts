import { c } from 'ttag';

import { CryptoProxy } from '@proton/crypto';
import { arrayToHexString, binaryStringToArray } from '@proton/crypto/lib/utils';

import { API_CODES } from '../constants';
import { encodeBase64URL, uint8ArrayToString } from '../helpers/encoding';
import {
    SyncMultipleApiResponses,
    SyncMultipleApiSuccessResponses,
    VcalDateOrDateTimeProperty,
    VcalDateTimeProperty,
} from '../interfaces/calendar';
import { ACTION_VIEWS, MAXIMUM_DATE_UTC, MAX_CHARS_API, MINIMUM_DATE_UTC } from './constants';
import { propertyToUTCDate } from './vcalConverter';
import { getIsPropertyAllDay } from './vcalHelper';

export const HASH_UID_PREFIX = 'sha1-uid-';
export const ORIGINAL_UID_PREFIX = 'original-uid-';

export const getIsSuccessSyncApiResponse = (
    response: SyncMultipleApiResponses
): response is SyncMultipleApiSuccessResponses => {
    const {
        Response: { Code, Event },
    } = response;
    return Code === API_CODES.SINGLE_SUCCESS && !!Event;
};

/**
 * Generates a calendar UID of the form 'RandomBase64String@proton.me'
 * RandomBase64String has a length of 28 characters
 */
export const generateProtonCalendarUID = () => {
    // by convention we generate 21 bytes of random data
    const randomBytes = crypto.getRandomValues(new Uint8Array(21));
    const base64String = encodeBase64URL(uint8ArrayToString(randomBytes));
    // and we encode them in base 64
    return `${base64String}@proton.me`;
};

export const generateVeventHashUID = async (binaryString: string, uid = '', legacyFormat = false) => {
    const hash = arrayToHexString(
        await CryptoProxy.computeHash({ algorithm: 'unsafeSHA1', data: binaryStringToArray(binaryString) })
    );
    const hashUid = `${HASH_UID_PREFIX}${hash}`;
    if (!uid) {
        return hashUid;
    }
    const join = '-';
    const uidLength = uid.length;
    const availableLength = MAX_CHARS_API.UID - ORIGINAL_UID_PREFIX.length - hashUid.length - join.length;
    const croppedUID = uid.substring(uidLength - availableLength, uidLength);
    return legacyFormat
        ? `${hashUid}${join}${ORIGINAL_UID_PREFIX}${croppedUID}`
        : `${ORIGINAL_UID_PREFIX}${croppedUID}${join}${hashUid}`;
};

export const getOriginalUID = (uid = '') => {
    if (!uid) {
        return '';
    }
    const regexWithOriginalUid = new RegExp(`^${ORIGINAL_UID_PREFIX}(.+)-${HASH_UID_PREFIX}[abcdef\\d]{40}`);
    const regexWithOriginalUidLegacyFormat = new RegExp(
        `^${HASH_UID_PREFIX}[abcdef\\d]{40}-${ORIGINAL_UID_PREFIX}(.+)`
    );
    const [, match] = uid.match(regexWithOriginalUid) || uid.match(regexWithOriginalUidLegacyFormat) || [];
    if (match) {
        return match;
    }
    const regexWithoutOriginalUid = new RegExp(`^${HASH_UID_PREFIX}[abcdef\\d]{40}$`);
    if (regexWithoutOriginalUid.test(uid)) {
        return '';
    }
    return uid;
};

export const getHasLegacyHashUID = (uid = '') => {
    if (!uid) {
        return false;
    }
    return new RegExp(`^${HASH_UID_PREFIX}[abcdef\\d]{40}-${ORIGINAL_UID_PREFIX}`).test(uid);
};

export const getSupportedUID = (uid: string) => {
    const uidLength = uid.length;
    return uid.substring(uidLength - MAX_CHARS_API.UID, uidLength);
};

const getIsWellFormedDateTime = (property: VcalDateTimeProperty) => {
    return property.value.isUTC || !!property.parameters!.tzid;
};

export const getIsWellFormedDateOrDateTime = (property: VcalDateOrDateTimeProperty) => {
    return getIsPropertyAllDay(property) || getIsWellFormedDateTime(property);
};

export const getIsDateOutOfBounds = (property: VcalDateOrDateTimeProperty) => {
    const dateUTC: Date = propertyToUTCDate(property);
    return +dateUTC < +MINIMUM_DATE_UTC || +dateUTC > +MAXIMUM_DATE_UTC;
};

/**
 * Try to guess from the event uid if an event was generated by Proton. In pple there are two possibilities
 * * Old uids of the form 'proton-calendar-350095ea-4368-26f0-4fc9-60a56015b02e' and derived ones from "this and future" editions
 * * New uids of the form 'RandomBase64String@proton.me' and derived ones from "this and future" editions
 */
export const getIsProtonUID = (uid = '') => {
    return uid.endsWith('@proton.me') || uid.startsWith('proton-calendar-');
};

/**
 * Try to naively guess the domain of a provider from the uid.
 * This helper only works when the uid is of the form `${randomString}@${domain}`
 */
export const getNaiveDomainFromUID = (uid = '') => {
    const parts = uid.split('@');
    const numberOfParts = parts.length;

    if (numberOfParts <= 1) {
        return '';
    }

    return parts[numberOfParts - 1];
};

export const getDisplayTitle = (title = '') => {
    return title.trim() || c('Event title').t`(no title)`;
};

/**
 * Check whether an object has more keys than a set of keys.
 */
export const hasMoreThan = (set: Set<string>, properties: { [key: string]: any } = {}) => {
    return Object.keys(properties).some((key) => !set.has(key));
};

export const wrap = (res: string, prodId?: string) => {
    // Wrap in CRLF according to the rfc
    return prodId
        ? `BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:${prodId}\r\n${res}\r\nEND:VCALENDAR`
        : `BEGIN:VCALENDAR\r\nVERSION:2.0\r\n${res}\r\nEND:VCALENDAR`;
};

export const unwrap = (res: string) => {
    if (res.slice(0, 15) !== 'BEGIN:VCALENDAR') {
        return res;
    }
    const startIdx = res.indexOf('BEGIN:', 1);
    if (startIdx === -1 || startIdx === 0) {
        return '';
    }
    const endIdx = res.lastIndexOf('END:VCALENDAR');
    return res.slice(startIdx, endIdx).trim();
};

export const getLinkToCalendarEvent = ({
    calendarID,
    eventID,
    recurrenceID,
}: {
    calendarID: string;
    eventID: string;
    recurrenceID?: number;
}) => {
    const params = new URLSearchParams();
    params.set('Action', ACTION_VIEWS.VIEW);
    params.set('EventID', eventID);
    params.set('CalendarID', calendarID);
    if (recurrenceID) {
        params.set('RecurrenceID', `${recurrenceID}`);
    }

    return `/event?${params.toString()}`;
};

export const naiveGetIsDecryptionError = (error: any) => {
    // We sometimes need to detect if an error produced while reading an event is due to a failed decryption.
    // We don't have a great way of doing this as the error comes from openpgp
    const errorMessage = error?.message || '';

    return errorMessage.toLowerCase().includes('decrypt');
};
