import React from 'react';
import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';
import Information from './Information';
import Paragraph from '../paragraph/Paragraph';

// list = [{ icon, text, to, link }]
const RelatedSettingsSection = ({ list = [{}] }) => {
    if (list.length > 2) {
        throw new Error('You can only display 2 blocks in RelatedSettingsSection');
    }
    return (
        <div className="flex flex-spacebetween ontablet-flex-column">
            {list.map(({ icon, text, to, link }, index) => {
                return (
                    <div key={index.toString()} className="w45 flex ontablet-mb1">
                        <Information icon={icon}>
                            <Paragraph>{text}</Paragraph>
                            <Paragraph className="aligncenter mtauto">
                                <Link className="pm-button pm-button--primary" to={to}>
                                    {link}
                                </Link>
                            </Paragraph>
                        </Information>
                    </div>
                );
            })}
        </div>
    );
};

RelatedSettingsSection.propTypes = {
    list: PropTypes.array,
};

export default RelatedSettingsSection;
