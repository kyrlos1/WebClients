import React, { useContext } from 'react';
import { Loader } from '../loader';
import { GlobalLoaderTasksContext } from './GlobalLoaderProvider';

const GlobalLoader = () => {
    const [task] = useContext(GlobalLoaderTasksContext) || [];

    if (!task) {
        return null;
    }

    const text = task.options.text;

    return (
        <div
            className="fixed flex centered-absolute-horizontal bg-white-dm color-global-grey-dm p0-5 rounded"
            style={{ top: '1.5em' }}
        >
            <Loader size="small" className="flex" />
            {text && <span className="ml0-5">{text}</span>}
        </div>
    );
};

export default GlobalLoader;
