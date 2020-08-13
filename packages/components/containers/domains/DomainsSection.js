import React from 'react';
import { c, msgid } from 'ttag';
import { wait } from 'proton-shared/lib/helpers/promise';
import { Alert, PrimaryButton, Button, Block, Loader } from '../../components';
import { useEventManager, useOrganization, useDomains, useModals, useLoading } from '../../hooks';

import DomainModal from './DomainModal';
import DomainsTable from './DomainsTable';
import RestoreAdministratorPrivileges from '../organization/RestoreAdministratorPrivileges';
import useDomainsAddresses from '../../hooks/useDomainsAddresses';

const DomainsSection = () => {
    const [domains, loadingDomains] = useDomains();
    const [domainsAddressesMap, loadingDomainsAddressesMap] = useDomainsAddresses(domains);
    const [organization, loadingOrganization] = useOrganization();
    const [loading, withLoading] = useLoading();
    const { createModal } = useModals();
    const { call } = useEventManager();

    if (loadingOrganization) {
        return <Loader />;
    }

    const { UsedDomains, MaxDomains } = organization;

    const handleRefresh = async () => {
        // To not spam the event manager.
        await wait(200);
        await call();
    };

    return (
        <>
            <RestoreAdministratorPrivileges />
            <Alert learnMore="https://protonmail.com/support/categories/custom-domains/">
                {c('Message')
                    .t`Add a domain to receive emails to your custom email addresses and to add more users to your organization (Visionary and Professional accounts only).`}
            </Alert>
            <Block>
                <PrimaryButton onClick={() => createModal(<DomainModal />)} className="mr1">
                    {c('Action').t`Add domain`}
                </PrimaryButton>
                <Button disabled={loadingDomains} loading={loading} onClick={() => withLoading(handleRefresh())}>{c(
                    'Action'
                ).t`Refresh status`}</Button>
            </Block>
            {!loadingDomains && !loadingDomainsAddressesMap && !domains.length ? null : (
                <DomainsTable
                    domains={domains}
                    domainsAddressesMap={domainsAddressesMap}
                    loading={loadingDomains || loadingDomainsAddressesMap}
                />
            )}
            <Block className="opacity-50">
                {UsedDomains} / {MaxDomains} {c('Info').ngettext(msgid`domain used`, `domains used`, UsedDomains)}
            </Block>
        </>
    );
};

export default DomainsSection;
